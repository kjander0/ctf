package net

import (
	"encoding/json"

	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/log"
)

type InputMsg struct {
	CmdBits int
}

type GameStateMsg struct {
	Players []PlayerState
}

type PlayerState struct {
	X float64
	Y float64
}

const (
	leftBit  = 1
	rightBit = 2
	upBit    = 4
	downBit  = 8
)

func ReceiveInputs(world *entity.World) {
	for i := range world.PlayerList {
		select {
		case msgBytes := <-world.PlayerList[i].Client.ReadC:
			var inputMsg InputMsg
			err := json.Unmarshal(msgBytes, &inputMsg)
			if err != nil {
				// TODO: player needs to be removed from server
				log.Errorf("update_net: error decoding JSON: {}", err)
				// TODO: don't close here, because we will be writing in the next step
				close(world.PlayerList[i].Client.WriteC)
			}
			var newInputState entity.PlayerInput

			if (inputMsg.CmdBits & leftBit) == leftBit {
				newInputState.Left = true
			}

			if (inputMsg.CmdBits & rightBit) == rightBit {
				newInputState.Right = true
			}

			if (inputMsg.CmdBits & upBit) == upBit {
				newInputState.Up = true
			}

			if (inputMsg.CmdBits & downBit) == downBit {
				newInputState.Down = true
			}

		default:
		}
	}
}

// Sends world state to all
func Dispatch(world *entity.World) {
	// TODO, don't send unchanged attributes of players
}
