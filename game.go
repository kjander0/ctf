package main

import (
	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/net"
	"github.com/kjander0/ctf/web"
)

const (
	TickRate    = 30.0
	TickSecs    = 1.0 / TickRate
	PlayerSpeed = 5.0
)

type Game struct {
	ClientC chan web.Client
	World   entity.World
}

func NewGame(clientC chan web.Client) Game {
	return Game{
		ClientC: clientC,
		World:   entity.NewWorld(),
	}
}

func (g Game) Run() {
	ticker := NewTicker(TickRate)
	ticker.Start()

	tickCount := 0
	for {
		select {
		case newClient := <-g.ClientC:
			g.World.PlayerList = append(g.World.PlayerList, entity.NewPlayer(newClient))
		default:
		}

		net.ReceiveInputs(&g.World)
		updatePlayerMovement(&g.World)
		net.SendWorldUpdate(&g.World)
		removeDisconnectedPlayers(&g.World)

		//logger.Debug("Tick count", tickCount)
		tickCount += 1

		// read player inputs
		// spawn bullets
		// update player, bullet movement
		// damage players, destroy, respawn
		ticker.Sleep()
	}
}

func updatePlayerMovement(world *entity.World) {
	for i := range world.PlayerList {
		input := world.PlayerList[i].Input
		// TODO: last pressed would probs feel better?
		var dir mymath.Vec
		if input.Left {
			dir.X -= 1
		}
		if input.Right {
			dir.X += 1
		}
		if input.Up {
			dir.Y += 1
		}
		if input.Down {
			dir.Y -= 1
		}

		world.PlayerList[i].Pos = world.PlayerList[i].Pos.Add(dir.Scale(PlayerSpeed))
	}
}

func removeDisconnectedPlayers(world *entity.World) {
	for i := len(world.PlayerList) - 1; i >= 0; i -= 1 { // loop backwards for removing elements
		if world.PlayerList[i].DoDisconnect {
			logger.Infof("'%s' disconnected, remaining players: %d", world.PlayerList[i].Client.Username, len(world.PlayerList)-1)
			close(world.PlayerList[i].Client.WriteC)
			world.PlayerList[i] = world.PlayerList[len(world.PlayerList)-1]
			world.PlayerList = world.PlayerList[0 : len(world.PlayerList)-1]
		}
	}
}
