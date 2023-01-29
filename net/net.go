package net

import (
	"bytes"

	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
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

// Flags from client
const (
	shootFlagBit = 1
)

// Flags from server
const (
	throttleFlagBit = 1
	ackInputFlagBit = 2
)

func ReceiveInputs(world *entity.World) error {
	for i := range world.PlayerList {
		//logger.Debug("len readC: ", len(world.PlayerList[i].Client.ReadC))
		select {
		case msgBytes := <-world.PlayerList[i].Client.ReadC:
			decoder := NewDecoder(msgBytes)
			msgType := decoder.ReadUint8()

			if msgType != inputMsgType {
				logger.Error("ReceiveInputs: bad msg type: ", msgType)
				world.PlayerList[i].DoDisconnect = true
				continue
			}

			world.PlayerList[i].InputAcked = true

			flags := decoder.ReadUint8()
			inputTick := decoder.ReadUint8() // read tick count

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

			if (flags & shootFlagBit) == shootFlagBit {
				newInputState.DoShoot = true
				newInputState.ShootPos = mymath.Vec{
					X: decoder.ReadFloat64(),
					Y: decoder.ReadFloat64(),
				}
				newInputState.Tick = inputTick
				logger.Debug(newInputState)
			}

			world.PlayerList[i].Input = newInputState

			if decoder.Error != nil {
				logger.Error("ReceiveInputs: decoder error: ", decoder.Error)
				world.PlayerList[i].DoDisconnect = true
				continue
			}

		default:
			logger.Error("ReceiveInputs: no inputs available")
			world.PlayerList[i].InputAcked = false
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
			logger.Error("SendWorldUpdate: WriteC would block, disconnecting player")
			world.PlayerList[i].DoDisconnect = true
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
	if world.PlayerList[playerIndex].InputAcked {
		flags |= ackInputFlagBit
	}

	encoder.WriteUint8(stateUpdateMsgType)
	encoder.WriteUint8(flags)
	encoder.WriteUint8(world.TickCount)

	encoder.WriteVec(world.PlayerList[playerIndex].Pos)

	encoder.WriteUint8(uint8(len(world.PlayerList) - 1))
	for i := range world.PlayerList {
		if i == playerIndex {
			continue
		}
		encoder.WriteUint8(world.PlayerList[i].Id)
		// TODO, don't send unchanged attributes of players
		encoder.WriteVec(world.PlayerList[i].Pos)

		// TODO: can probs have some general per other player flags, or maybe send list of new lasers
		// in a seperate block of bytes
		if world.PlayerList[i].Input.DoShoot {
			encoder.WriteUint8(1)
			Shoot pos is wrong here, laser has been fast forwarded already!
			Instead send start pos and angle!!!
			encoder.WriteVec(world.PlayerList[i].Input.ShootPos)
		} else {
			encoder.WriteUint8(0)
		}
	}

	if encoder.Error != nil {
		logger.Panic("SendWorldUpdate: encoder error: ", encoder.Error)
	}

	return buf.Bytes()
}
