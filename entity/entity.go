package entity

import (
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/web"
)

const (
	GridSize = 10
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

type Player struct {
	Pos          mymath.Vec
	Client       web.Client
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

func NewPlayer(client web.Client) Player {
	return Player{
		Client: client,
	}
}

type Tile struct {
	color int
}
