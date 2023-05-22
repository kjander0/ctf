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

func LaserSpeed(laserType uint8) float64 {
	switch laserType {
	case ProjTypeLaser:
		return conf.Shared.LaserSpeed
	case ProjTypeBouncy:
		return conf.Shared.BouncySpeed
	}
	logger.Panic("unsupported laser type")
	return -1
}

func UpdateProjectiles(world *World) {
	world.NewHits = world.NewHits[:0]

	// Stage new lasers (they get advanced forward on same tick they were created)
	world.LaserList = append(world.LaserList, world.NewLasers...)

	// Increment activeTicks count and remove old lasers
	for i := len(world.LaserList) - 1; i >= 0; i-- {
		world.LaserList[i].ActiveTicks += 1
		if world.LaserList[i].ActiveTicks > conf.Shared.LaserTimeTicks {
			world.LaserList[i] = world.LaserList[len(world.LaserList)-1]
			world.LaserList = world.LaserList[:len(world.LaserList)-1]
		}
	}

	// Move lasers forward
	for i := range world.LaserList {
		laser := &world.LaserList[i]
		speed := LaserSpeed(laser.Type)
		dir := laser.Dir
		laser.Line.Start = laser.Line.End
		disp := speed
		laser.Line.End = laser.Line.End.Add(dir.Scale(disp))
	}

	// Check collisions
	for i := len(world.LaserList) - 1; i >= 0; i-- { // reverse iterate for removing elements
		if processCollisions(world, i) {
			world.LaserList[i] = world.LaserList[len(world.LaserList)-1]
			world.LaserList = world.LaserList[:len(world.LaserList)-1]
		}
	}
}

// Returns true if laser has hit a wall and should be destroyed
func processCollisions(world *World, laserIndex int) bool {
	// Keep resolving collisions until laser has stopped bouncing
	bounceCount := 0
	for {
		line := world.LaserList[laserIndex].Line
		hitDist, hitPos, normal := checkWallHit(world, line)
		player, playerHitPos := checkPlayerHit(world, &world.LaserList[laserIndex], hitDist)

		if hitDist < 0 && player == nil { // no hit occured
			return false
		}

		if player != nil {
			player.Health -= 1
			hitPos = playerHitPos
			world.NewHits = append(world.NewHits, hitPos)
			return true
		}

		if world.LaserList[laserIndex].Type != ProjTypeBouncy {
			return true
		}
		bounce(&world.LaserList[laserIndex], hitPos, normal)

		bounceCount++
		if bounceCount > conf.Shared.MaxBounces {
			logger.Errorf("Reached bounce count limit: %d", conf.Shared.MaxBounces)
			return true // laser is stuck, remove laser
		}
	}
}

func checkWallHit(world *World, line mymath.Line) (float64, mymath.Vec, mymath.Vec) {
	tileSize := float64(conf.Shared.TileSize)
	tileRect := mymath.Rect{Size: mymath.Vec{tileSize, tileSize}}
	lineLen := line.Length()
	tileSample := world.Map.SampleTiles(line.End, lineLen, LaserCollisionGroup)
	var hitPos, hitNormal mymath.Vec
	hitDist := -1.0
	for _, tile := range tileSample {
		tileRect.Pos = tile.Pos

		var intersected bool
		var hit, normal mymath.Vec

		switch tile.Type {
		case TileTypeWall:
			intersected, hit, normal = mymath.LaserRectIntersect(line, tileRect)
			if !intersected {
				continue
			}
		case TileTypeWallTriangle:
			fallthrough
		case TileTypeWallTriangleCorner:
			t0, t1, t2 := tile.CalcTrianglePoints()
			intersected, hit, normal = mymath.LaserTriangleIntersect(line, t0, t1, t2)
			if !intersected {
				continue
			}
		default:
			continue
		}

		dist := line.Start.DistanceTo(hit)
		if hitDist == -1 || dist < hitDist {
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
		intersected, hit := mymath.LaserCircleIntersect(laser.Line, playerCircle)
		if !intersected {
			continue
		}
		dist := laser.Line.Start.DistanceTo(hit)
		if hitDist == -1 || dist < hitDist {
			hitPos = hit
			hitDist = dist
			player = &world.PlayerList[i]
		}
	}
	return player, hitPos
}

func bounce(laser *Laser, hitPos mymath.Vec, normal mymath.Vec) {
	incident := laser.Line.End.Sub(laser.Line.Start)
	laser.Dir = incident.Reflect(normal).Normalize()
	laser.Line.Start = hitPos
	newLen := laser.Line.End.Sub(hitPos).Length()
	laser.Line.End = hitPos.Add(laser.Dir.Scale(newLen))
	//logger.Debug("bounce: ", laser.Line.Start, laser.Line.End)
}
