package entity

import (
	"math/rand"

	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
)

const (
	TileEmpty = iota
	TileFloor
	TileWall
	TileWallTriangle
	TileWallTriangleCorner

	TileGreenSpawn
	TileRedSpawn
	TileYellowSpawn
	TileBlueSpawn

	TileGreenJail
	TileRedJail
	TileYellowJail
	TileBlueJail

	TileGreenFlagGoal
	TileRedFlagGoal
	TileYellowFlagGoal
	TileBlueFlagGoal

	TileFlagSpawn
)

type Tile struct {
	Type uint8
	Pos  mymath.Vec

	// CCW orientation of base of triangle tiles
	//   2
	// 3 /\ 1
	//   0
	Orientation uint8

	Solid bool
}

type Map struct {
	Rows           [][]Tile
	GreenJails     []mymath.Vec
	RedJails       []mymath.Vec
	GreenSpawns    []mymath.Vec
	RedSpawns      []mymath.Vec
	FlagSpawns     []mymath.Vec
	GreenFlagGoals []mymath.Vec
	RedFlagGoals   []mymath.Vec
}

func (t Tile) CalcTrianglePoints() (mymath.Vec, mymath.Vec, mymath.Vec) {
	var p0, p1, p2 mymath.Vec
	tileSize := float64(conf.Shared.TileSize)
	if t.Type == TileWallTriangle {
		switch t.Orientation {
		case 0:
			p0 = t.Pos
			p1 = t.Pos.AddXY(tileSize, 0)
			p2 = t.Pos.AddXY(tileSize/2, tileSize/2)
		case 1:
			p0 = t.Pos.AddXY(tileSize, 0)
			p1 = t.Pos.AddXY(tileSize, tileSize)
			p2 = t.Pos.AddXY(tileSize/2, tileSize/2)
		case 2:
			p0 = t.Pos.AddXY(tileSize, tileSize)
			p1 = t.Pos.AddXY(0, tileSize)
			p2 = t.Pos.AddXY(tileSize/2, tileSize/2)
		case 3:
			p0 = t.Pos.AddXY(0, tileSize)
			p1 = t.Pos
			p2 = t.Pos.AddXY(tileSize/2, tileSize/2)
		}
	} else if t.Type == TileWallTriangleCorner {
		switch t.Orientation {
		case 0:
			p0 = t.Pos
			p1 = t.Pos.AddXY(tileSize, 0)
			p2 = t.Pos.AddXY(0, tileSize)
		case 1:
			p0 = t.Pos.AddXY(tileSize, 0)
			p1 = t.Pos.AddXY(tileSize, tileSize)
			p2 = t.Pos
		case 2:
			p0 = t.Pos.AddXY(tileSize, tileSize)
			p1 = t.Pos.AddXY(0, tileSize)
			p2 = t.Pos.AddXY(tileSize, 0)
		case 3:
			p0 = t.Pos.AddXY(0, tileSize)
			p1 = t.Pos
			p2 = t.Pos.AddXY(tileSize, tileSize)
		}
	} else {
		logger.Panic("triangle tile was expected")
	}
	return p0, p1, p2
}

func IsSolidType(t uint8) bool {
	return t == TileWall || t == TileWallTriangle || t == TileWallTriangleCorner
}

func NewMap(rows [][]uint8) Map {
	var newMap Map

	for r := range rows {
		newMap.Rows = append(newMap.Rows, []Tile{})
		for c := range rows[r] {
			tile := Tile{
				Pos:  TileBottomLeft(r, c),
				Type: rows[r][c],
			}

			if tile.Type == TileWallTriangle || tile.Type == TileWallTriangleCorner {
				tile.Orientation = 0
			}

			switch tile.Type {
			case TileWall:
				tile.Solid = true
			case TileWallTriangle:
				tile.Solid = true
			case TileWallTriangleCorner:
				tile.Solid = true
			case TileGreenJail:
				newMap.GreenJails = append(newMap.GreenJails, TileCentre(r, c))
			case TileRedJail:
				newMap.RedJails = append(newMap.RedJails, TileCentre(r, c))
			case TileGreenSpawn:
				newMap.GreenSpawns = append(newMap.GreenSpawns, TileCentre(r, c))
			case TileRedSpawn:
				newMap.RedSpawns = append(newMap.RedSpawns, TileCentre(r, c))
			case TileFlagSpawn:
				newMap.FlagSpawns = append(newMap.FlagSpawns, TileCentre(r, c))
			case TileGreenFlagGoal:
				newMap.GreenFlagGoals = append(newMap.GreenFlagGoals, TileCentre(r, c))
			case TileRedFlagGoal:
				newMap.RedFlagGoals = append(newMap.RedFlagGoals, TileCentre(r, c))
			}

			newMap.Rows[r] = append(newMap.Rows[r], tile)
		}
	}

	return newMap
}

func (m *Map) RandomLocation(locations []mymath.Vec) mymath.Vec {
	return locations[rand.Intn(len(locations))]
}

func (m *Map) SampleSolidTiles(pos mymath.Vec, radius float64) []Tile {
	tileSize := float64(conf.Shared.TileSize)
	col := int(pos.X / tileSize)
	row := int(pos.Y / tileSize)
	steps := int(radius/tileSize) + 1
	samples := make([]Tile, 0, (1+2*steps)*(1+2*steps))
	for r := row - steps; r <= row+steps; r++ {
		for c := col - steps; c <= col+steps; c++ {
			if r < 0 || r >= len(m.Rows) || c < 0 || c >= len(m.Rows[r]) {
				continue
			}
			tile := m.Rows[r][c]
			if !IsSolidType(tile.Type) {
				continue
			}
			samples = append(samples, tile)
		}
	}
	return samples
}

func isWall(rows [][]uint8, ri int, ci int) bool {
	if ri < 0 || ri >= len(rows) {
		return false
	}
	if ci < 0 || ci >= len(rows[ri]) {
		return false
	}
	return IsSolidType(rows[ri][ci])
}

func TileCentre(row int, col int) mymath.Vec {
	return mymath.Vec{float64(col) + 0.5, float64(row) + 0.5}.Scale(float64(conf.Shared.TileSize))
}

func TileBottomLeft(row int, col int) mymath.Vec {
	return mymath.Vec{float64(col), float64(row)}.Scale(float64(conf.Shared.TileSize))
}
