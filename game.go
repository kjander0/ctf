package main

const tickRate = 30.0

const gridSize = 10

type Game struct {
	ClientC chan Client
	World   World
}

func NewGame(clientC chan Client) Game {
	return Game{
		ClientC: clientC,
		World:   NewWorld(),
	}
}

func (g Game) Run() {
	ticker := NewTicker(tickRate)
	ticker.Start()

	for {
		select {
		case newClient := <-g.ClientC:
			g.World.PlayerList = append(g.World.PlayerList, NewPlayer(newClient))
		default:
		}

		update_net(&g.World)

		// read player inputs
		// spawn bullets
		// update player, bullet movement
		// damage players, destroy, respawn
		ticker.Sleep()
	}
}
