package entity

const (
	GridSize = 10
)

type World struct {
	PlayerList    []Player
	TileList      []Tile
	freePlayerIds []uint8
	playerIdCount int
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

func (w *World) NextPlayerId() (bool, uint8) {
	if w.playerIdCount < 256 {
		id := uint8(w.playerIdCount)
		w.playerIdCount += 1
		return true, id
	}

	if len(w.freePlayerIds) > 0 {
		id := w.freePlayerIds[len(w.freePlayerIds)-1]
		w.freePlayerIds = w.freePlayerIds[0 : len(w.freePlayerIds)-1]
		return true, id
	}

	return false, 0
}

func (w *World) FreePlayerId(id uint8) {
	w.freePlayerIds = append(w.freePlayerIds, id)
}

type Tile struct {
	color int
}
