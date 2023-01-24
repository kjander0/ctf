package entity

import (
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/net"
)

const (
	GridSize = 10
)

type World struct {
	DeltaSecs  float64
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
