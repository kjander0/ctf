package net

import (
	"bytes"

	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
)

// IF player ticking too slow:
// - server predictions will grow
// - server will still be responsive since any received input corrects a prediction immediately
// IF player ticking too fast:
// - server will not be responsive as it takes time to get through pending list
// - server will start drop extra inputs to keep pace

const (
	maxBufferedInputs    = 20 // needs to be large enough to allow catchup of burst of delayed inputs
	maxMotionPredictions = 5  // too much motion extrapolation causes overshoot
	maxReadsPerTick      = 10
)

const (
	inputMsgType       uint8 = 0
	stateUpdateMsgType uint8 = 1
	initMsgType        uint8 = 2
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
	ackInputFlagBit = 1
)

func ReceiveMessages(world *entity.World) {
	for i := range world.PlayerList {
		processMessages(&world.PlayerList[i])
	}
}

// Read and process a message from a player. Returns True if their could be more messages.
func processMessages(player *entity.Player) {
	// TODO: If client has spammed loads of messages, could loop here endlessly (limit reads per tick)
	player.InputsAdvanced = false
outer:
	for i := 0; i < maxReadsPerTick; i++ {
		var msgBytes []byte
		var readOk bool
		select {
		case msgBytes, readOk = <-player.Client.ReadC:
			if !readOk {
				player.DoDisconnect = true
				return
			}
		default:
			break outer
		}

		decoder := NewDecoder(msgBytes)
		msgType := decoder.ReadUint8()

		switch msgType {
		case inputMsgType:
			processInputMsg(player, decoder)
			if player.DoDisconnect {
				return
			}
			player.GotFirstInput = true
		default:
			logger.Error("ReceiveInputs: bad msg type: ", msgType)
			player.DoDisconnect = true
			return
		}
	}

	if player.InputsAdvanced || !player.GotFirstInput {
		return
	}

	// Input buffer has not grown, so we predict an input instead
	numUnacked := 0
	for i := range player.Inputs {
		if !player.Inputs[i].Acked {
			numUnacked += 1
		}
	}

	predicted := entity.PlayerInput{}
	// Extrapolation of movement for a limited number of ticks
	if numUnacked < maxMotionPredictions {
		predicted.Left = player.LastInput.Left
		predicted.Right = player.LastInput.Right
		predicted.Up = player.LastInput.Up
		predicted.Down = player.LastInput.Down
	}

	player.Inputs = append(player.Inputs, predicted)

	// TODO: use circular buffer of inputs so this dropping is taken care of
	if len(player.Inputs) > maxBufferedInputs {
		logger.Debug("predicted input overflows input buffer, DROPPING an input")
		player.Inputs = player.Inputs[1:] // TODO: remove a predicted input, not an acked one!
	}
}

func processInputMsg(player *entity.Player, decoder Decoder) {
	flags := decoder.ReadUint8()
	var newInputState entity.PlayerInput
	newInputState.Acked = true

	newInputState.ClientTick = decoder.ReadUint8() // read tick count

	cmdBits := decoder.ReadUint8()
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
	}

	if decoder.Error != nil {
		logger.Error("ReceiveInputs: decoder error: ", decoder.Error)
		player.DoDisconnect = true
		return
	}

	player.LastInput = newInputState

	for i := range player.Inputs {
		if !player.Inputs[i].Acked {
			player.Inputs[i] = newInputState
			return
		}
	}

	if player.InputsAdvanced {
		// have already grown input buffer, replace with latest
		logger.Debug("Already advanced input, overwriting input")
		player.Inputs[len(player.Inputs)-1] = newInputState
		return
	}

	player.Inputs = append(player.Inputs, newInputState)
	player.InputsAdvanced = true

	if len(player.Inputs) > maxBufferedInputs {
		logger.Debug("new input overflows input buffer, DROPPING an input")
		player.Inputs = player.Inputs[1:]
	}
}

// Sends world state to all players
func SendMessages(world *entity.World) error {
	// TODO: Encode snap shot of entities once. Store unacked snapshots for each entity. Send only delta between
	// latest snapshot and last acked snapshot. Could delta per-byte and use bitflag to tell which bytes changed
	for i := range world.PlayerList {
		var msgBytes []byte
		switch world.PlayerList[i].State {
		case entity.PlayerStateJoining:
			msgBytes = prepareInitMsg(world, i)
			world.PlayerList[i].State = entity.PlayerStateAlive
		case entity.PlayerStateAlive:
			msgBytes = prepareWorldUpdate(world, i)
		}

		select {
		case world.PlayerList[i].Client.WriteC <- msgBytes:
		default:
			logger.Error("SendWorldUpdate: WriteC would block, disconnecting player")
			world.PlayerList[i].DoDisconnect = true
			continue
		}
	}

	return nil
}

func prepareInitMsg(world *entity.World, playerIndex int) []byte {
	buf := bytes.Buffer{}
	encoder := NewEncoder(&buf)
	encoder.WriteUint8(initMsgType)
	encoder.WriteUint8(world.PlayerList[playerIndex].Id)
	// TODO: encode world once, send to all joining players
	for i := range world.Level.Rows {
		encoder.WriteBytes(world.Level.Rows[i])
	}
	if encoder.Error != nil {
		logger.Panic("prepareInitMsg: encoder error: ", encoder.Error)
	}
	return buf.Bytes()
}

func prepareWorldUpdate(world *entity.World, playerIndex int) []byte {
	// TODO: if we start delta encoding at the byte level, then we will want each field to line up with the same bytes
	// for each message. Otherwise comparing bytes for different fields which are likely to be different.
	player := &world.PlayerList[playerIndex]
	var buf bytes.Buffer
	encoder := NewEncoder(&buf)

	var flags uint8

	numAcked := 0
	for i := range player.Inputs {
		if player.Inputs[i].Acked {
			numAcked += 1
		}
	}
	if numAcked > 0 {
		flags |= ackInputFlagBit
	}

	encoder.WriteUint8(stateUpdateMsgType)
	encoder.WriteUint8(flags)
	encoder.WriteUint8(world.Tick)

	if numAcked > 0 {
		encoder.WriteUint8(player.Inputs[numAcked-1].ClientTick)
		if !player.Inputs[numAcked-1].Acked {
			logger.Panic("OH NO")
		}
		player.Inputs = player.Inputs[numAcked:]
	}

	encoder.WriteVec(player.Pos)

	encoder.WriteUint8(uint8(len(world.PlayerList) - 1))
	for i := range world.PlayerList {
		if i == playerIndex {
			continue
		}
		encoder.WriteUint8(world.PlayerList[i].Id)
		encoder.WriteVec(world.PlayerList[i].PredictedPos)
		encoder.WriteUint8(uint8(world.PlayerList[i].LastInput.GetDirNum()))
	}

	var numNewLasers uint16
	numLasersOffset := encoder.Offset
	encoder.WriteUint16(0) // placeholder number of new lasers
	for i := range world.NewLasers {
		laser := world.NewLasers[i]
		encoder.WriteUint8(laser.PlayerId)
		encoder.WriteVec(laser.Line.End)
		encoder.WriteFloat64(laser.Angle)
		numNewLasers += 1
	}
	encoder.WriteUint16At(numNewLasers, numLasersOffset)

	if encoder.Error != nil {
		logger.Panic("prepareWorldUpdate: encoder error: ", encoder.Error)
	}

	return buf.Bytes()
}
