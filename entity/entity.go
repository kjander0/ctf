package entity

import (
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/net"
)

const (
	TickRate  = 30.0
	DeltaSecs = 1.0 / TickRate
	GridSize  = 10
)

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

const (
	PlayerSpeed = 150
)

type Player struct {
	Pos    mymath.Vec
	Client net.Client
	Input  PlayerInput
}

type PlayerInput struct {
	Left  bool
	Right bool
	Up    bool
	Down  bool
}

func NewPlayer(client net.Client) Player {
	return Player{
		Client: client,
	}
}

type Tile struct {
	color int
}

func updatePlayerMovement(world *World) {
	for i := range world.PlayerList {
		input := world.PlayerList[i].Input
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
	}
}
