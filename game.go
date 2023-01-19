package main

import "encoding/json"

// - load game state struct from database
// - save into database sequentially

type Game struct {
	ClientC          chan Client
	UsernameToClient map[string]Client
	World            World
	inputC           chan PlayerInputMsg
}

type PlayerInputMsg struct {
	Username string
	InputMsg InputMsg
}

func NewGame(clientC chan Client) Game {
	return Game{
		ClientC:          clientC,
		UsernameToClient: make(map[string]Client),
		World:            NewWorld(),
	}
}

func (g Game) run() {
	for {
		select {
		case newClient := <-g.ClientC:
			// associate client with a player
			var existingClient, ok = g.UsernameToClient[newClient.Username]
			if ok {
				close(existingClient.WriteC)
			}
			g.UsernameToClient[newClient.Username] = newClient
			go readMessages(newClient, g.inputC)

		case input := <-g.inputC:
			logDebug("messaged received from player; {}", input.Username)
			g.World = g.World.Update(input.Username, input.InputMsg)
		}
	}
}

// reads client messages into player message channel
func readMessages(client Client, messageC chan PlayerInputMsg) {
	for {
		msgBytes, ok := <-client.ReadC
		if !ok {
			logDebug("game: readMessages: client readC closed")
			return
		}
		var msg PlayerInputMsg
		err := json.Unmarshal(msgBytes, &msg.InputMsg)
		if err != nil {
			logError("game: readMessages: error parsing JSON")
		}
		msg.Username = client.Username
		messageC <- msg
	}
}
