package main

const (
	PlayerSpeed = 150
)

type Player struct {
	Pos    Vec
	Client Client
	Input  InputState
}

type InputState struct {
	Left  bool
	Right bool
	Up    bool
	Down  bool
}

func NewPlayer(client Client) Player {
	return Player{
		Client: client,
	}
}

func updatePlayerMovement(world *World) {
	for i := range world.PlayerList {
		input := world.PlayerList[i].Input
		var dir Vec
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
	}
}
