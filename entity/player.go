package entity

import (
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
	Input        PlayerInput
	DoDisconnect bool
	DoThrottle   bool
}

type PlayerInput struct {
	Left  bool
	Right bool
	Up    bool
	Down  bool
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
