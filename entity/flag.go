package entity

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
)

type Flag struct {
	Held bool
	Team int // -1 if not delivered to a goal yet
	Pos  mymath.Vec
}

func NewFlag(pos mymath.Vec) Flag {
	return Flag{
		Pos:  pos,
		Team: -1,
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
				if player.State != PlayerStateAlive || player.LastInput.DropFlag {
					player.FlagIndex = -1
					player.FlagCooldownTicks = FlagCooldownTicks
					continue
				}

				flag.Held = true
				flag.Pos = player.Acked.Pos
				tryDeliverFlag(world, flag, player)
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

				if player.Team == flag.Team {
					continue
				}

				dist := player.Acked.Pos.DistanceTo(flag.Pos)
				if dist > float64(1.2*conf.Shared.PlayerRadius) || player.FlagCooldownTicks > 0 {
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
				flag.Team = -1
				flag.Pos = closestPlayer.Acked.Pos
			}
		}
	}

	numGreen := 0
	numRed := 0
	for i := range world.FlagList {
		flag := &world.FlagList[i]
		switch flag.Team {
		case TeamGreen:
			numGreen++
		case TeamRed:
			numRed++
		}
	}

	numFlags := len(world.FlagList)
	if numGreen == numFlags {
		world.WinningTeam = TeamGreen
	} else if numRed == numFlags {
		world.WinningTeam = TeamRed
	}

	if world.WinningTeam != -1 && world.WinCooldownTicks == 0 {
		world.WinCooldownTicks = 150
	}
}

func tryDeliverFlag(world *World, flag *Flag, player *Player) {
	var flagGoals []mymath.Vec
	switch player.Team {
	case TeamGreen:
		flagGoals = world.Map.GreenFlagGoals
	case TeamRed:
		flagGoals = world.Map.RedFlagGoals
	default:
		logger.Panic("unsupported team")
	}

	for _, goalPos := range flagGoals {
		if flag.Pos.DistanceTo(goalPos) < float64(conf.Shared.TileSize) {
			flag.Team = player.Team
			flag.Pos = goalPos
			flag.Held = false
			player.FlagIndex = -1
		}
	}
}
