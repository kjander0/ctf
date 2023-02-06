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
	// Move lasers forward
	for i := range world.LaserList {
		line := world.LaserList[i].Line
		dir := world.LaserList[i].Dir
		line.Start = line.End
		line.End = line.End.Add(dir.Scale(conf.Shared.LaserSpeed))
		world.LaserList[i].Line = line
	}
}
