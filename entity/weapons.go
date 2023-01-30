package entity

import (
	"math"

	"github.com/kjander0/ctf/logger"
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

func UpdateWeapons(world *World) {
	moveLasers(world)

	// Spawn new lasers
	world.NewLasers = world.NewLasers[:0]
	for i := range world.PlayerList {
		playerInput := world.PlayerList[i].Input
		if !playerInput.DoShoot {
			continue
		}
		dir := mymath.Vec{X: math.Cos(playerInput.AimAngle), Y: math.Sin(playerInput.AimAngle)}
		newLaser := Laser{
			world.PlayerList[i].Id,
			mymath.Line{
				Start: world.PlayerList[i].Pos,
				End:   world.PlayerList[i].Pos,
			},
			dir,
			playerInput.AimAngle,
		}
		// Compensate for shooter's lag by fast forwarding the end point of the laser
		serverTick := int(world.TickCount)
		clientTick := int(playerInput.Tick)
		if serverTick < clientTick { // server tick has wrapped and client tick has not
			serverTick += 256
		}
		// TODO limit tick difference so we arn't teleporting lasers too dramatically
		tickDiff := serverTick - clientTick
		logger.Debug("tickdiff ", tickDiff)
		for j := 0; j < tickDiff; j += 1 {
			newLaser.Line.End = newLaser.Line.End.Add(newLaser.Dir.Scale(LaserSpeed))
		}

		world.LaserList = append(world.LaserList, newLaser)
		world.NewLasers = append(world.NewLasers, &world.LaserList[len(world.LaserList)-1])
	}
}

func moveLasers(world *World) {
	for i := range world.LaserList {
		line := world.LaserList[i].Line
		dir := line.End.Sub(line.Start).Normalize()
		line.Start = line.End
		line.End = line.End.Add(dir.Scale(LaserSpeed))
		world.LaserList[i].Line = line
	}
}
