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
	ackInputFlagBit = 2
)

func ReceiveMessages(world *entity.World) {
	for i := range world.PlayerList {
		processMessages(&world.PlayerList[i])
		logger.Debug("num inputs: ", len(world.PlayerList[i].Inputs))
	}
}

// Read and process a message from a player. Returns True if their could be more messages.
func processMessages(player *entity.Player) {
	// TODO: If client has spammed loads of messages, could loop here endlessly
	inputsAdvanced := false
outer:
	for {
		var msgBytes []byte
		select {
		case msgBytes = <-player.Client.ReadC:
		default:
			break outer
		}
		decoder := NewDecoder(msgBytes)
		msgType := decoder.ReadUint8()

		switch msgType {
		case inputMsgType:
			inputsBefore := len(player.Inputs)
			processInputMsg(player, decoder)
			inputsAdvanced = len(player.Inputs) > inputsBefore
		default:
			logger.Error("ReceiveInputs: bad msg type: ", msgType)
			player.DoDisconnect = true
			return
		}
	}

	if inputsAdvanced {
		return
	}

	// TODO: add inputs to list so we can correct for dropped/delayed packets, etc. If we are correcting then
	// we probs don't have to have client ticking running faster than server.

	// TODO: limit how much we predict, e.g. player has minimised game for a minute
	logger.Error("ReceiveInputs: no inputs available")
	predicted := entity.PlayerInput{}
	lastInput := player.Inputs[len(player.Inputs)-1]
	// Extrapolate movement only
	predicted.Left = lastInput.Left
	predicted.Right = lastInput.Right
	predicted.Up = lastInput.Up
	predicted.Down = lastInput.Down
	player.Inputs = append(player.Inputs, predicted)
}

func processInputMsg(player *entity.Player, decoder Decoder) {
	flags := decoder.ReadUint8()
	clientTick := decoder.ReadUint8() // read tick count

	// Client intentionally send inputs at slightly faster tick rate than server. This ensures that server
	// always has an input available at each tick. However, we periodically throttle client such that we
	// don't buffer inputs for too long.
	// TODO: If we start sending other kinds of messages, then we will want to buffer input messages seperately to
	// do this calculation
	player.DoThrottle = len(player.Client.ReadC) > 1
	cmdBits := decoder.ReadUint8()
	var newInputState entity.PlayerInput
	newInputState.Acked = true
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
		newInputState.ClientTick = clientTick
	}

	if decoder.Error != nil {
		logger.Error("ReceiveInputs: decoder error: ", decoder.Error)
		player.DoDisconnect = true
		return
	}

	for i := range player.Inputs {
		if !player.Inputs[i].Acked {
			player.Inputs[i] = newInputState
			return
		}
	}

	player.Inputs = append(player.Inputs, newInputState)
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
	// TODO: if we start delta encoding at the byte level, then we will want each field to line up with the same bytes
	// for each message. Otherwise comparing bytes for different fields which are likely to be different.
	player := &world.PlayerList[playerIndex]
	var buf bytes.Buffer
	encoder := NewEncoder(&buf)

	var flags uint8
	if player.DoThrottle {
		flags |= throttleFlagBit
	}

	inputIndex := 0
	for inputIndex = range player.Inputs {
		if !player.Inputs[inputIndex].Acked {
			break
		}
	}
	if inputIndex > 0 {
		flags |= ackInputFlagBit
		player.Inputs = player.Inputs[inputIndex:]
	}

	encoder.WriteUint8(stateUpdateMsgType)
	encoder.WriteUint8(flags)
	encoder.WriteUint8(world.Tick)

	if inputIndex > 0 {
		encoder.WriteUint8(player.Inputs[inputIndex-1].ClientTick)
	}

	encoder.WriteVec(player.Pos)

	encoder.WriteUint8(uint8(len(world.PlayerList) - 1))
	for i := range world.PlayerList {
		if i == playerIndex {
			continue
		}
		encoder.WriteUint8(world.PlayerList[i].Id)
		encoder.WriteVec(world.PlayerList[i].PredictedPos)
	}

	var numNewLasers uint16
	numLasersOffset := encoder.Offset
	encoder.WriteUint16(0) // placeholder number of new lasers
	for i := range world.NewLasers {
		laser := world.NewLasers[i]
		if laser.PlayerId == player.Id {
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
