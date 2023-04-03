package entity

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
)

const (
	ProjTypeLaser = uint8(iota)
	ProjTypeBouncy
	ProjTypeMissile
)

type Laser struct {
	Type        uint8
	PlayerId    uint8
	Line        mymath.Line
	Dir         mymath.Vec
	Angle       float64
	ActiveTicks int
}

func UpdateProjectiles(world *World) {
	world.NewHits = world.NewHits[:0]

	// Remove old lasers
	for i := len(world.LaserList) - 1; i >= 0; i-- {
		world.LaserList[i].ActiveTicks += 1
		if world.LaserList[i].ActiveTicks > conf.Shared.LaserTimeTicks {
			world.LaserList[i] = world.LaserList[len(world.LaserList)-1]
			world.LaserList = world.LaserList[:len(world.LaserList)-1]
		}
	}

	// Move lasers forward
	for i := range world.LaserList {
		speed := conf.Shared.LaserSpeed
		if world.LaserList[i].Type == ProjTypeBouncy {
			speed = conf.Shared.BouncySpeed
		}
		line := world.LaserList[i].Line
		dir := world.LaserList[i].Dir
		line.Start = line.End
		line.End = line.End.Add(dir.Scale(speed))
		world.LaserList[i].Line = line
	}

	// Check collisions
	for i := len(world.LaserList) - 1; i >= 0; i-- { // reverse iterate for removing elements
		line := world.LaserList[i].Line
		hitDist, hitPos, normal := checkWallHit(world, line)
		player, playerHitPos := checkPlayerHit(world, &world.LaserList[i], hitDist)

		if hitDist < 0 && player == nil { // no hit occured
			continue
		}

		if player != nil {
			player.Health -= 1
			if player.Health <= 0 {
				player.Acked.Pos = world.Map.RandomJailLocation()
				player.Health = conf.Shared.PlayerHealth
				player.JailTimeTicks = conf.Shared.JailTimeTicks
				player.State = PlayerStateJailed
			}
			hitPos = playerHitPos
		} else if world.LaserList[i].Type == ProjTypeBouncy {
			bounce(&world.LaserList[i], hitPos, normal)
			continue
		}

		world.NewHits = append(world.NewHits, hitPos)
		world.LaserList[i] = world.LaserList[len(world.LaserList)-1]
		world.LaserList = world.LaserList[:len(world.LaserList)-1]
	}

	// Stage new lasers to be moved forward on the next tick in sync with clients
	world.LaserList = append(world.LaserList, world.NewLasers...)
}

func checkWallHit(world *World, line mymath.Line) (float64, mymath.Vec, mymath.Vec) {
	tileSize := float64(conf.Shared.TileSize)
	tileRect := mymath.Rect{Size: mymath.Vec{tileSize, tileSize}}
	lineLen := line.Length()
	tileSample := world.Map.SampleSolidTiles(line.End, lineLen)
	var hitPos, hitNormal mymath.Vec
	hitDist := -1.0
	for _, tile := range tileSample {
		tileRect.Pos = tile.Pos

		var overlaps bool
		var overlap, normal mymath.Vec

		if tile.Type == TileWall {
			overlaps, overlap, normal = mymath.LineRectOverlap(line, tileRect)
			if !overlaps {
				continue
			}
		} else if tile.Type == TileWallTriangle || tile.Type == TileWallTriangleCorner {
			t0, t1, t2 := tile.CalcTrianglePoints()
			overlaps, overlap, normal = mymath.LineTriangleOverlap(line, t0, t1, t2)
			if !overlaps {
				continue
			}
			logger.Debug("tri: ", overlap, normal)
		}

		hit := line.End.Add(overlap)
		dist := line.Start.DistanceTo(hit)
		if hitDist < 0 || dist < hitDist {
			hitPos = hit
			hitDist = dist
			hitNormal = normal
		}
	}
	return hitDist, hitPos, hitNormal
}

func checkPlayerHit(world *World, laser *Laser, hitDist float64) (*Player, mymath.Vec) {
	var hitPos mymath.Vec
	var player *Player
	for i := range world.PlayerList {
		if world.PlayerList[i].Id == laser.PlayerId {
			continue
		}
		// TODO: consider testing collisions using predicted position
		playerCircle := mymath.Circle{world.PlayerList[i].Acked.Pos, conf.Shared.PlayerRadius}
		overlaps, overlap := mymath.LineCircleOverlap(playerCircle, laser.Line)
		if !overlaps {
			continue
		}
		hit := laser.Line.End.Add(overlap)
		dist := laser.Line.Start.DistanceTo(hit)
		if hitDist < 0 || dist < hitDist {
			hitPos = hit
			hitDist = dist
			player = &world.PlayerList[i]
		}
	}
	return player, hitPos
}

func bounce(laser *Laser, hitPos mymath.Vec, normal mymath.Vec) {
	incident := laser.Line.End.Sub(laser.Line.Start)
	len := incident.Length()
	newLen := len - hitPos.Sub(laser.Line.Start).Length()
	laser.Dir = incident.Reflect(normal).Normalize()
	laser.Line.Start = hitPos
	laser.Line.End = hitPos.Add(laser.Dir.Scale(newLen))
}
