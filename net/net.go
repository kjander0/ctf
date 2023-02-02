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

// Flags from client
const (
	shootFlagBit = 1
)

// Flags from server
const (
	throttleFlagBit = 1
)

func ReceiveInputs(world *entity.World) error {
	for i := range world.PlayerList {
		// TODO: add inputs to list so we can correct for dropped/delayed packets, etc. If we are correcting then
		// we probs don't have to have client ticking running faster than server.
		var msgBytes []byte
		select {
		case msgBytes = <-world.PlayerList[i].Client.ReadC:
		default:
			logger.Error("ReceiveInputs: no inputs available")
			world.PlayerList[i].InputReceived = false
			predicted := entity.PlayerInput{}
			lastInput := world.PlayerList[i].Input
			// Extrapolate movement only
			predicted.Left = lastInput.Left
			predicted.Right = lastInput.Right
			predicted.Up = lastInput.Up
			predicted.Down = lastInput.Down
			world.PlayerList[i].PredictedInputs = append(world.PlayerList[i].PredictedInputs, predicted)
			world.PlayerList[i].Input = predicted
			continue
		}

		decoder := NewDecoder(msgBytes)
		msgType := decoder.ReadUint8()

		if msgType != inputMsgType {
			logger.Error("ReceiveInputs: bad msg type: ", msgType)
			world.PlayerList[i].DoDisconnect = true
			continue
		}

		world.PlayerList[i].InputReceived = true

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
			newInputState.AimAngle = decoder.ReadFloat64()
			newInputState.Tick = inputTick
		}

		world.PlayerList[i].Input = newInputState
		if len(world.PlayerList[i].PredictedInputs) > 0 {
			world.PlayerList[i].PredictedInputs = world.PlayerList[i].PredictedInputs[1:]
		}

		if decoder.Error != nil {
			logger.Error("ReceiveInputs: decoder error: ", decoder.Error)
			world.PlayerList[i].DoDisconnect = true
			continue
		}
	}
	return nil
}

// Sends world state to all players
func SendWorldUpdate(world *entity.World) error {
	// TODO: Encode snap shot of entities once. Store unacked snapshots for each entity. Send only delta between
	// latest snapshot and last acked snapshot. Could delta per-byte and use bitflag to tell which bytes changed
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

	encoder.WriteUint8(stateUpdateMsgType)
	encoder.WriteUint8(flags)
	encoder.WriteUint8(world.Tick)

	encoder.WriteVec(world.PlayerList[playerIndex].Pos)

	encoder.WriteUint8(uint8(len(world.PlayerList) - 1))
	for i := range world.PlayerList {
		if i == playerIndex {
			continue
		}
		encoder.WriteUint8(world.PlayerList[i].Id)
		encoder.WriteVec(world.PlayerList[i].Pos)
	}

	var numNewLasers uint16
	numLasersOffset := encoder.Offset
	encoder.WriteUint16(0) // placeholder number of new lasers
	for i := range world.NewLasers {
		laser := world.NewLasers[i]
		if laser.PlayerId == world.PlayerList[playerIndex].Id {
			continue
		}
		encoder.WriteUint8(laser.PlayerId)
		encoder.WriteVec(laser.Line.End)
		encoder.WriteFloat64(laser.Angle)
		numNewLasers += 1
	}
	encoder.WriteUint16At(numNewLasers, numLasersOffset)

	if encoder.Error != nil {
		logger.Panic("SendWorldUpdate: encoder error: ", encoder.Error)
	}

	return buf.Bytes()
}
