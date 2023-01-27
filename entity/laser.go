package entity

import "github.com/kjander0/ctf/mymath"

const (
	LaserSpeed = 15
)

type Laser struct {
	// TODO: needs to be linked to player. Maybe just player id.
	Line mymath.Line
}

func MoveLasers(world *World) {
	for i := range world.LaserList {
		line := world.LaserList[i].Line
		dir := line.End.Sub(line.Start).Normalize()
		line.Start = line.End
		line.End = line.End.Add(dir.Scale(LaserSpeed))
		world.LaserList[i].Line = line
	}
}
