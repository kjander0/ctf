package entity

import "github.com/kjander0/ctf/mymath"

type World struct {
	Tick          uint8
	Map           *Map
	PlayerList    []Player
	LaserList     []Laser
	NewLasers     []Laser
	NewHits       []mymath.Vec
	freePlayerIds []uint8
	playerIdCount int
	FlagList      []Flag
}

func NewWorld() World {
	return World{
		Map: LoadMap("www/assets/maps/test.bin"),
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
