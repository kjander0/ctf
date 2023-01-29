package entity

import "github.com/kjander0/ctf/mymath"

const (
	LaserSpeed = 15
)

type Laser struct {
	PlayerId uint8
	Line     mymath.Line
	Dir      mymath.Vec
}

func UpdateWeapons(world *World) {
	moveLasers(world)

	// Spawn new lasers
	for i := range world.PlayerList {
		playerInput := world.PlayerList[i].Input
		if !playerInput.DoShoot {
			continue
		}
		dir := playerInput.ShootPos.Sub(world.PlayerList[i].Pos)
		dirLen := dir.Length()
		if dirLen < 1e-3 {
			dir = mymath.Vec{X: 1, Y: 0}
		} else {
			dir = dir.Scale(1.0 / dirLen)
		}
		newLaser := Laser{
			world.PlayerList[i].Id,
			mymath.Line{
				Start: world.PlayerList[i].Pos,
				End:   world.PlayerList[i].Pos,
			},
			dir,
		}
		// Compensate for shooter's lag by fast forwarding the end point of the laser
		serverTick := int(world.TickCount)
		clientTick := int(playerInput.Tick)
		if serverTick < clientTick { // server tick has wrapped and client tick has not
			serverTick += 256
		}
		tickDiff := serverTick - clientTick
		for j := 0; j < tickDiff; j += 1 {
			newLaser.Line.End = newLaser.Line.End.Add(newLaser.Dir.Scale(LaserSpeed))
		}

		world.LaserList = append(world.LaserList, newLaser)
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
