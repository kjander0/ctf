package entity

import (
	"math/rand"

	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/mymath"
)

const (
	TileEmpty = iota
	TileWall
	TileJail
	TileSpawn
)

type Map struct {
	Rows   [][]uint8
	Jails  []mymath.Vec
	Spawns []mymath.Vec
}

func NewMap(rows [][]uint8) Map {
	newMap := Map{
		Rows: rows,
	}

	// Find spawn/jail spots
	for r := range rows {
		for c := range rows[r] {
			if rows[r][c] == TileJail {
				newMap.Jails = append(newMap.Jails, TileCentre(r, c))
			} else if rows[r][c] == TileSpawn {
				newMap.Spawns = append(newMap.Spawns, TileCentre(r, c))
			}
		}
	}

	return newMap
}

func (m *Map) RandomJailLocation() mymath.Vec {
	return m.Jails[rand.Intn(len(m.Jails))]
}

func (m *Map) RandomSpawnLocation() mymath.Vec {
	return m.Spawns[rand.Intn(len(m.Spawns))]
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
			if tile != TileWall {
				continue
			}
			samples = append(samples, TileBottomLeft(r, c))
		}
	}
	return samples
}

func TileCentre(row int, col int) mymath.Vec {
	return mymath.Vec{float64(col) + 0.5, float64(row) + 0.5}.Scale(float64(conf.Shared.TileSize))
}

func TileBottomLeft(row int, col int) mymath.Vec {
	return mymath.Vec{float64(col), float64(row)}.Scale(float64(conf.Shared.TileSize))
}
