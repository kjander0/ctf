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

	for i := len(world.LaserList) - 1; i >= 0; i-- { // reverse iterate for removing elements
		line := world.LaserList[i].Line
		hitDist, hitPos := checkWallHit(world, line)
		player, playerHitPos := checkPlayerHit(world, &world.LaserList[i], hitDist)

		if hitDist < 0 && player == nil { // no hit occured
			continue
		}

		if player != nil {
			hitPos = playerHitPos
		}

		world.NewHits = append(world.NewHits, hitPos)
		world.LaserList[i] = world.LaserList[len(world.LaserList)-1]
		world.LaserList = world.LaserList[:len(world.LaserList)-1]
	}
}

func checkWallHit(world *World, line mymath.Line) (float64, mymath.Vec) {
	tileSize := float64(conf.Shared.TileSize)
	tileRect := mymath.Rect{Size: mymath.Vec{tileSize, tileSize}}
	lineLen := line.Length()
	tileSample := world.Map.SampleSolidTiles(line.End, lineLen)
	var hitPos mymath.Vec
	hitDist := -1.0
	for _, tilePos := range tileSample {
		tileRect.Pos = tilePos
		overlaps, overlap := mymath.LineRectOverlap(line, tileRect)
		if !overlaps {
			continue
		}
		hit := line.End.Add(overlap)
		dist := line.Start.DistanceTo(hit)
		if hitDist < 0 || dist < hitDist {
			hitPos = hit
			hitDist = dist
		}
	}
	return hitDist, hitPos
}

func checkPlayerHit(world *World, laser *Laser, hitDist float64) (*Player, mymath.Vec) {
	var hitPos mymath.Vec
	var player *Player
	for i := range world.PlayerList {
		if world.PlayerList[i].Id == laser.PlayerId {
			continue
		}
		playerCircle := mymath.Circle{world.PlayerList[i].Pos, conf.Shared.PlayerRadius}
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
