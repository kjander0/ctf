package main

import (
	"encoding/json"

	"github.com/kjander0/ctf/net"
)

type Game struct {
	ClientC chan net.Client
	World   World
}

func NewGame(clientC chan net.Client) Game {
	return Game{
		ClientC: clientC,
		World:   NewWorld(),
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

		net.ReceiveInputs(&g.World)
		updatePlayerMovement(&g.World)
		net.Dispatch(&g.World)

		// read player inputs
		// spawn bullets
		// update player, bullet movement
		// damage players, destroy, respawn
		ticker.Sleep()
	}
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
