package main

import (
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

func NewGame(clientC chan web.Client) Game {
	return Game{
		ClientC: clientC,
		World:   entity.NewWorld(),
	}
}

func (g *Game) Run() {
	ticker := NewTicker(float64(conf.Shared.TickRate))
	ticker.Start()

	for {
		// TODO: probs wanna accept more than 1 client per tick?
		select {
		case newClient := <-g.ClientC:
			ok, id := g.World.NextPlayerId()
			if !ok {
				logger.Debug("server full, rejecting connection")
				close(newClient.WriteC)
			}
			g.World.PlayerList = append(g.World.PlayerList, entity.NewPlayer(id, newClient))
		default:
		}

		net.ReceiveMessages(&g.World)
		entity.UpdatePlayers(&g.World)
		entity.UpdateProjectiles(&g.World)
		net.SendMessages(&g.World)
		removeDisconnectedPlayers(&g.World)

		g.World.Tick += 1

		ticker.Sleep()
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
