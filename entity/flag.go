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
		for j := range world.PlayerList {
			player := &world.PlayerList[j]

			if flag.Held {
				if player.FlagIndex == i {
					if player.State != PlayerStateAlive {
						flag.Held = false
						player.FlagIndex = -1
					} else {
						flag.Pos = player.Acked.Pos
					}
				}
			} else {
				if player.State == PlayerStateAlive && player.Acked.Pos.DistanceTo(flag.Pos) < float64(conf.Shared.TileSize) {
					flag.Held = true
					player.FlagIndex = i
				}
			}

		}
	}
}
