package main

import (
	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/net"
	"github.com/kjander0/ctf/web"
)

const (
	TickRate = 30.0
	TickSecs = 1.0 / TickRate
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
	ticker := NewTicker(TickRate)
	ticker.Start()

	tickCount := 0
	for {
		// TODO: probs wanna accept more than 1 client per tick?
		select {
		case newClient := <-g.ClientC:
			ok, id := g.World.NextPlayerId()
			if !ok {
				close(newClient.WriteC)
			}
			g.World.PlayerList = append(g.World.PlayerList, entity.NewPlayer(id, newClient))
		default:
		}

		net.ReceiveInputs(&g.World)
		entity.UpdatePlayerMovement(&g.World)
		net.SendWorldUpdate(&g.World)
		removeDisconnectedPlayers(&g.World)

		//logger.Debug("Tick count", tickCount)
		tickCount += 1

		// read player inputs
		// spawn bullets
		// update player, bullet movement
		// damage players, destroy, respawn
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
