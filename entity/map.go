package entity

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/mymath"
)

const (
	TileEmpty = 0
	TileSolid = iota
)

type Map struct {
	Rows [][]uint8
}

func (m *Map) SampleSolidTiles(pos mymath.Vec, radius float64) []mymath.Vec {
	tileSize := float64(conf.Shared.TileSize)
	col := int(pos.X / tileSize)
	row := int(pos.Y / tileSize)
	steps := int(radius/tileSize) + 1
	samples := make([]mymath.Vec, 0, (1+2*steps)*(1+2*steps))
	for r := row - steps; r <= row+steps; r++ {
		for c := col - steps; c <= col+steps; c++ {
			if r < 0 || r >= len(m.Rows) || c < 0 || c >= len(m.Rows[r]) {
				continue
			}
			tile := m.Rows[r][c]
			if tile == TileEmpty {
				continue
			}
			samples = append(samples, mymath.Vec{float64(c), float64(r)}.Scale(tileSize))
		}
	}
	return samples
}
