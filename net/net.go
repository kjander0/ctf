package net

import (
	"bytes"

	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
)

const (
	inputMsgType       uint8 = 0
	stateUpdateMsgType uint8 = 1
)

const (
	leftBit  = 1
	rightBit = 2
	upBit    = 4
	downBit  = 8
)

const (
	throttleFlagBit = 1
)

func ReceiveInputs(world *entity.World) error {
	for i := range world.PlayerList {
		//logger.Debug("len readC: ", len(world.PlayerList[i].Client.ReadC))
		select {
		case clientMsg := <-world.PlayerList[i].Client.ReadC:
			decoder := NewDecoder(clientMsg.Data)
			msgType := decoder.ReadUint8()

			if msgType != inputMsgType {
				logger.Error("ReceiveInputs: bad msg type: ", msgType)
				world.PlayerList[i].DoDisconnect = true
				continue
			}

			// Client intentionally send inputs at slightly faster tick rate than server. This ensures that server
			// always has an input available at each tick. However, we periodically throttle client such that we
			// don't buffer inputs for too long.
			// TODO: If we start sending other kinds of messages, then we will want to buffer input messages seperately to
			// do this calculation
			world.PlayerList[i].DoThrottle = len(world.PlayerList[i].Client.ReadC) > 1
			cmdBits := decoder.ReadUint8()
			var newInputState entity.PlayerInput

			if (cmdBits & leftBit) == leftBit {
				newInputState.Left = true
			}

			if (cmdBits & rightBit) == rightBit {
				newInputState.Right = true
			}

			if (cmdBits & upBit) == upBit {
				newInputState.Up = true
			}

			if (cmdBits & downBit) == downBit {
				newInputState.Down = true
			}
			world.PlayerList[i].Input = newInputState

			if decoder.Error != nil {
				logger.Error("ReceiveInputs: decoder error: ", decoder.Error)
				world.PlayerList[i].DoDisconnect = true
				continue
			}

		default:
			logger.Error("ReceiveInputs: no inputs available")
		}
	}
	return nil
}

// Sends world state to all players
func SendWorldUpdate(world *entity.World) error {
	// TODO: can reuse parts of world update for all players
	// (e.g. use same general player list and tack extra player attributes to the end)
	for i := range world.PlayerList {
		updateBytes := prepareWorldUpdateForPlayer(world, i)

		select {
		case world.PlayerList[i].Client.WriteC <- updateBytes:
		default:
			// TODO, might want to just make it a buffered channel and disconnect player
			// at this point. Then we don't have to worry about lost packets.
			logger.Error("SendWorldUpdate: WriteC would block")
			continue
		}
	}

	return nil
}

func prepareWorldUpdateForPlayer(world *entity.World, playerIndex int) []byte {
	var buf bytes.Buffer
	encoder := NewEncoder(&buf)

	var flags uint8
	if world.PlayerList[playerIndex].DoThrottle {
		flags |= throttleFlagBit
	}

	encoder.WriteUint8(stateUpdateMsgType)
	encoder.WriteUint8(flags)

	encoder.WriteVec(world.PlayerList[playerIndex].Pos)

	encoder.WriteUint8(uint8(len(world.PlayerList) - 1))
	for i := range world.PlayerList {
		if i == playerIndex {
			continue
		}
		encoder.WriteUint8(world.PlayerList[i].Id)
		// TODO, don't send unchanged attributes of players
		encoder.WriteVec(world.PlayerList[i].Pos)
	}

	if encoder.Error != nil {
		logger.Panic("SendWorldUpdate: encoder error: ", encoder.Error)
	}

	return buf.Bytes()
}
