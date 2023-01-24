package main

import (
	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/net"
)

const (
	TickRate    = 30.0
	DeltaSecs   = 1.0 / TickRate
	PlayerSpeed = 150
)

type Game struct {
	ClientC chan net.Client
	World   entity.World
}

func NewGame(clientC chan net.Client) Game {
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

		g.World.DeltaSecs = DeltaSecs
		ReceiveInputs(&g.World)
		updatePlayerMovement(&g.World)
		SendWorldUpdate(&g.World)

		logger.Debug("Tick count", tickCount)
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

		world.PlayerList[i].Pos = world.PlayerList[i].Pos.Add(dir.Scale(PlayerSpeed * DeltaSecs))
		logger.Debug("new dir: ", dir)
	}
}
