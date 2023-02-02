package entity

import (
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/web"
)

const (
	PlayerSpeed = 2.5
)

type Player struct {
	Id              uint8
	Client          web.Client
	Pos             mymath.Vec
	LastAckedPos    mymath.Vec
	Input           PlayerInput
	PredictedInputs []PlayerInput
	InputReceived   bool
	DoDisconnect    bool
	DoThrottle      bool
}

type PlayerInput struct {
	Tick     uint8
	Left     bool
	Right    bool
	Up       bool
	Down     bool
	DoShoot  bool
	AimAngle float64
}

func NewPlayer(id uint8, client web.Client) Player {
	return Player{
		Id:     id,
		Client: client,
	}
}

func MovePlayers(world *World) {
	for i := range world.PlayerList {
		input := world.PlayerList[i].Input

		if world.PlayerList[i].InputReceived {
			world.PlayerList[i].LastAckedPos = world.PlayerList[i].LastAckedPos.Add(calcDisplacement(input))
		}

		world.PlayerList[i].Pos = world.PlayerList[i].LastAckedPos
		for j := range world.PlayerList[i].PredictedInputs {
			predicted := world.PlayerList[i].PredictedInputs[j]
			world.PlayerList[i].Pos = world.PlayerList[i].Pos.Add(calcDisplacement(predicted))
		}
	}
}

func calcDisplacement(input PlayerInput) mymath.Vec {
	// TODO: test with movement occuring in direction of last pressed key
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
