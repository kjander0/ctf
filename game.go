package main

import (
	"math/rand"

	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/net"
	"github.com/kjander0/ctf/web"
)

// TODO: Game struct should really be a game runner, providing players and update ticks to each game
type Game struct {
	ClientC chan web.Client
	World   entity.World
}

func NewGame(clientC chan web.Client, gameMap *entity.Map) Game {
	return Game{
		ClientC: clientC,
		World:   entity.NewWorld(gameMap),
	}
}

func (g *Game) Run() {
	ticker := NewTicker(float64(conf.Shared.TickRate))
	ticker.Start()

	reset(g)

	for {
		// TODO: probs wanna accept more than 1 client per tick?
		select {
		case newClient := <-g.ClientC:
			ok, id := g.World.NextPlayerId()
			if !ok {
				logger.Debug("server full, rejecting connection")
				close(newClient.WriteC)
			}
			team := findNextTeam(&g.World)
			g.World.PlayerList = append(g.World.PlayerList, entity.NewPlayer(id, team, newClient))
		default:
		}

		net.ReceiveMessages(&g.World)
		entity.UpdatePlayers(&g.World)
		entity.UpdateProjectiles(&g.World)
		entity.UpdateFlags(&g.World)
		net.SendMessages(&g.World)
		removeDisconnectedPlayers(&g.World)

		g.World.Tick += 1

		ticker.Sleep()
	}
}

func reset(g *Game) {
	g.World.FlagList = []entity.Flag{}
	for _, pos := range g.World.Map.FlagSpawns {
		g.World.FlagList = append(g.World.FlagList, entity.Flag{
			Pos: pos,
		})
	}
}

func findNextTeam(world *entity.World) int {
	greenCount := 0
	redCount := 0
	for i := range world.PlayerList {
		switch world.PlayerList[i].Team {
		case entity.TeamGreen:
			greenCount += 1
		case entity.TeamRed:
			redCount += 1
		}
	}
	if greenCount > redCount {
		return entity.TeamGreen
	} else if redCount > greenCount {
		return entity.TeamGreen
	} else {
		if rand.Intn(2) == 0 {
			return entity.TeamGreen
		} else {
			return entity.TeamRed
		}
	}
}

func removeDisconnectedPlayers(world *entity.World) {
	for i := len(world.PlayerList) - 1; i >= 0; i -= 1 { // loop backwards for removing elements
		if world.PlayerList[i].DoDisconnect {
			logger.Infof("'%s' disconnected, remaining players: %d", world.PlayerList[i].Client.Username, len(world.PlayerList)-1)
			close(world.PlayerList[i].Client.WriteC)
			world.FreePlayerId(world.PlayerList[i].Id)
			world.PlayerList[i] = world.PlayerList[len(world.PlayerList)-1]
			world.PlayerList = world.PlayerList[0 : len(world.PlayerList)-1]
		}
	}
}
