package main

import (
	"bytes"
	"errors"

	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/net"
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

func ReceiveInputs(world *entity.World) error {
	for i := range world.PlayerList {
		select {
		case msgBytes := <-world.PlayerList[i].Client.ReadC:
			decoder := net.NewDecoder(msgBytes)
			msgType := decoder.ReadUint8()

			if msgType != inputMsgType {
				logger.Panic("ReceiveInputs: bad msg type: ", msgType)
			}

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
				// TODO: player needs to be removed from server
				logger.Error("ReceiveInputs: decoder error: ", decoder.Error)
				// TODO: don't close here, because we will be writing in same update
				close(world.PlayerList[i].Client.WriteC)
				return decoder.Error
			}

		default:
		}
	}
	return nil
}

// Sends world state to all players
func SendWorldUpdate(world *entity.World) error {
	var buf bytes.Buffer
	encoder := net.NewEncoder(&buf)

	encoder.WriteUint8(stateUpdateMsgType)
	encoder.WriteUint8(uint8(len(world.PlayerList)))
	for i := range world.PlayerList {
		// TODO, don't send unchanged attributes of players
		encoder.WriteVec(world.PlayerList[i].Pos)
	}

	if encoder.Error != nil {
		logger.Error("SendWorldUpdate: encoder error: ", encoder.Error)
		return encoder.Error
	}

	for i := range world.PlayerList {
		select {
		case world.PlayerList[i].Client.WriteC <- buf.Bytes():
		default:
			return errors.New("SendWorldUpdate: player writeC would block")
		}
	}
	return nil
}
