package main

import "encoding/json"

const (
	TickRate  = 30.0
	DeltaSecs = 1.0 / TickRate
	GridSize  = 10
)

type Game struct {
	ClientC chan Client
	World   World
}

func NewGame(clientC chan Client) Game {
	return Game{
		ClientC: clientC,
		World:   NewWorld(),
	}
}

type World struct {
	PlayerList []Player
	TileList   []Tile
}

func NewWorld() World {
	tiles := make([]Tile, GridSize*GridSize)
	for i := range tiles {
		tiles[i].color = i
	}

	return World{
		PlayerList: []Player{},
	}
}

func (g Game) Run() {
	ticker := NewTicker(TickRate)
	ticker.Start()

	for {
		select {
		case newClient := <-g.ClientC:
			g.World.PlayerList = append(g.World.PlayerList, NewPlayer(newClient))
		default:
		}

		readInputsFromPlayers(&g.World)
		updatePlayerMovement(&g.World)
		sendStateToPlayers(&g.World)

		// read player inputs
		// spawn bullets
		// update player, bullet movement
		// damage players, destroy, respawn
		ticker.Sleep()
	}
}

const (
	leftBit  = 1
	rightBit = 2
	upBit    = 4
	downBit  = 8
)

type InputMsg struct {
	CmdBits int
}

func readInputsFromPlayers(world *World) {
	for i := range world.PlayerList {
		select {
		case msgBytes := <-world.PlayerList[i].Client.ReadC:
			var inputMsg InputMsg
			err := json.Unmarshal(msgBytes, &inputMsg)
			if err != nil {
				// TODO: player needs to be removed from server
				LogErrorf("update_net: error decoding JSON: {}", err)
				// TODO: don't close here, because we will be writing in the next step
				close(world.PlayerList[i].Client.WriteC)
			}
			LogDebug("read cmd bits")
			var newInputState InputState

			if (inputMsg.CmdBits & leftBit) == leftBit {
				newInputState.Left = true
			}

			if (inputMsg.CmdBits & rightBit) == rightBit {
				newInputState.Right = true
			}

			if (inputMsg.CmdBits & upBit) == upBit {
				newInputState.Up = true
			}

			if (inputMsg.CmdBits & downBit) == downBit {
				newInputState.Down = true
			}

		default:
		}
	}
}

type GameStateMsg struct {
	Players []PlayerState
}

type PlayerState struct {
	X float64
	Y float64
}

func sendStateToPlayers(world *World) {
	var msg GameStateMsg
	for i := range world.PlayerList {
		msg.Players = append(msg.Players, PlayerState{world.PlayerList[i].Pos.X, world.PlayerList[i].Pos.Y})
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		LogPanic("sendStateToPlayers: ", err)
	}

	for i := range world.PlayerList {
		select {
		case world.PlayerList[i].Client.WriteC <- msgBytes:
		default:
			LogError("sendStateToPlayers: player writeC full")
		}
	}

}
