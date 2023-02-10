package entity

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/mymath"
)

type Laser struct {
	PlayerId uint8
	Line     mymath.Line
	Dir      mymath.Vec
	Angle    float64
}

func UpdateProjectiles(world *World) {
	world.NewHits = world.NewHits[:0]

	// Move lasers forward
	for i := range world.LaserList {
		line := world.LaserList[i].Line
		dir := world.LaserList[i].Dir
		line.Start = line.End
		line.End = line.End.Add(dir.Scale(conf.Shared.LaserSpeed))
		world.LaserList[i].Line = line
	}

	// Check collisions against walls
	tileSize := float64(conf.Shared.TileSize)
	tileRect := mymath.Rect{Size: mymath.Vec{tileSize, tileSize}}
	for i := range world.LaserList {
		line := world.LaserList[i].Line
		lineLen := line.Length()
		tileSample := world.Map.SampleSolidTiles(line.End, lineLen)
		for _, tilePos := range tileSample {
			tileRect.Pos = tilePos
			overlaps, overlap := mymath.LineRectOverlap(line, tileRect)
			if !overlaps {
				continue
			}
			hit := line.End.Add(overlap)
			world.NewHits = append(world.NewHits, hit)
		}
	}
}
