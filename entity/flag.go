package entity

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/mymath"
)

type Flag struct {
	Held bool
	Pos  mymath.Vec
}

func NewFlag(pos mymath.Vec) Flag {
	return Flag{
		Pos: pos,
	}
}

func UpdateFlags(world *World) {
	for i := range world.FlagList {
		flag := &world.FlagList[i]

		if flag.Held {
			flag.Held = false
			for j := range world.PlayerList {
				player := &world.PlayerList[j]
				if player.FlagIndex != i {
					continue
				}
				if player.State != PlayerStateAlive {
					player.FlagIndex = -1
					continue
				}
				flag.Held = true
				flag.Pos = player.Acked.Pos
			}
		}

		if !flag.Held {
			var closestPlayer *Player = nil
			var closestDist float64
			for j := range world.PlayerList {
				player := &world.PlayerList[j]
				if player.State != PlayerStateAlive {
					continue
				}

				dist := player.Acked.Pos.DistanceTo(flag.Pos)
				if dist > float64(2*conf.Shared.TileSize) {
					continue
				}
				if closestPlayer == nil || dist < closestDist {
					closestPlayer = player
					closestDist = dist
				}
			}

			if closestPlayer != nil {
				closestPlayer.FlagIndex = i
				flag.Held = true
				flag.Pos = closestPlayer.Acked.Pos
			}
		}

	}
}
