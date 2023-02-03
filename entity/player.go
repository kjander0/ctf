package entity

import (
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/web"
)

const (
	PlayerSpeed = 2.5
)

type Player struct {
	Id           uint8
	Client       web.Client
	Pos          mymath.Vec
	PredictedPos mymath.Vec
	Inputs       []PlayerInput
	DoDisconnect bool
	DoThrottle   bool
}

type PlayerInput struct {
	Acked      bool
	ClientTick uint8
	Left       bool
	Right      bool
	Up         bool
	Down       bool
	DoShoot    bool
	AimAngle   float64
}

func NewPlayer(id uint8, client web.Client) Player {
	return Player{
		Id:     id,
		Client: client,
	}
}

func MovePlayers(world *World) {
	for i := range world.PlayerList {
		inputs := world.PlayerList[i].Inputs
		prevPredicted := world.PlayerList[i].PredictedPos
		for j := range inputs {
			if inputs[j].Acked {
				world.PlayerList[i].Pos = world.PlayerList[i].Pos.Add(calcDisplacement(inputs[j]))
				world.PlayerList[i].PredictedPos = world.PlayerList[i].Pos
				continue
			}
			world.PlayerList[i].PredictedPos = world.PlayerList[i].PredictedPos.Add(calcDisplacement(inputs[j]))
		}
		logger.Debug("diff: ", world.PlayerList[i].PredictedPos.Sub(prevPredicted).Length())
	}
}

func calcDisplacement(input PlayerInput) mymath.Vec {
	// TODO: does it feel better if movement always occurs in direction of last pressed key (even if two opposing keys pressed)
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
	return dir.Scale(PlayerSpeed)
}
