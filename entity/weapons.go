package entity

import (
	"github.com/kjander0/ctf/mymath"
)

const (
	LaserSpeed = 8
)

type Laser struct {
	PlayerId uint8
	Line     mymath.Line
	Dir      mymath.Vec
	Angle    float64
}

func UpdateProjectiles(world *World) {
	// Move lasers forward
	for i := range world.LaserList {
		line := world.LaserList[i].Line
		dir := line.End.Sub(line.Start).Normalize()
		line.Start = line.End
		line.End = line.End.Add(dir.Scale(LaserSpeed))
		world.LaserList[i].Line = line
	}
}
