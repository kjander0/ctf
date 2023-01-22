package main

type World struct {
	PlayerList []Player
	TileList   []Tile
}

type Tile struct {
	color int
}

func NewWorld() World {
	tiles := make([]Tile, gridSize*gridSize)
	for i := range tiles {
		tiles[i].color = i
	}

	return World{
		PlayerList: []Player{},
	}
}
