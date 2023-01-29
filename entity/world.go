package entity

type World struct {
	TickCount     uint8
	PlayerList    []Player
	LaserList     []Laser
	NewLasers     []*Laser
	freePlayerIds []uint8
	playerIdCount int
}

func NewWorld() World {
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
