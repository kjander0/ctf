package net

import (
	"bytes"

	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
)

const (
	pendingInputThreshold = 0
	maxActiveInputs       = 20
	maxMotionPredictions  = 5
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
	ackInputFlagBit = 1
)

func ReceiveMessages(world *entity.World) {
	for i := range world.PlayerList {
		processMessages(&world.PlayerList[i])
	}
}

// Read and process a message from a player. Returns True if their could be more messages.
func processMessages(player *entity.Player) {
	// TODO: If client has spammed loads of messages, could loop here endlessly
outer:
	for {
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
			err := readInputMsg(player, decoder)
			if err != nil {
				player.DoDisconnect = true
				return
			}
			player.GotFirstInput = true
		default:
			logger.Error("ReceiveInputs: bad msg type: ", msgType)
			player.DoDisconnect = true
			return
		}
	}

	if player.GotFirstInput {
		stageInputs(player)

		// IF player ticking too slow:
		// - server predictions will grow
		// - server will still be responsive since any received input corrects a prediction immediately
		// - server will drop excessove active inputs resulting in player correction
		// IF player ticking too fast:
		// - server pending inputs will grow
		// - server will not be responsive as it takes time to get through pending list
		// - server will start droping extra pending inputs to keep pace
		if len(player.ActiveInputs) > maxActiveInputs {
			player.ActiveInputs = player.ActiveInputs[len(player.ActiveInputs)-maxActiveInputs:]
			logger.Error("DROPING ACTIVE INPUTS")
		}
		if len(player.PendingInputs) > pendingInputThreshold {
			player.PendingInputs = player.PendingInputs[1:]
			logger.Error("DROPING A PENDING INPUTS")
		}
	}

}

func readInputMsg(player *entity.Player, decoder Decoder) error {
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
		return decoder.Error
	}
	player.LastInput = newInputState

	player.PendingInputs = append(player.PendingInputs, newInputState)

	return nil
}

func stageInputs(player *entity.Player) {
	// Ack any unacked inputs
	for i := range player.ActiveInputs {
		if len(player.PendingInputs) == 0 {
			break
		}
		if !player.ActiveInputs[i].Acked {
			player.ActiveInputs[i] = player.PendingInputs[0]
			player.PendingInputs = player.PendingInputs[1:]
		}
	}

	// Add a pending input to the active input list if possible
	if len(player.PendingInputs) > 0 {
		player.ActiveInputs = append(player.ActiveInputs, player.PendingInputs[0])
		player.PendingInputs = player.PendingInputs[1:]
		return
	}

	// TODO: add inputs to list so we can correct for dropped/delayed packets, etc. If we are correcting then
	// we probs don't have to have client ticking running faster than server.

	// TODO: limit how many inputs we buffer, e.g. player has minimised game for a minute would be over throusand buffered
	numUnacked := 0
	for i := range player.ActiveInputs {
		if !player.ActiveInputs[i].Acked {
			numUnacked += 1
		}
	}

	predicted := entity.PlayerInput{}
	logger.Debug("active: ", numUnacked, " / ", len(player.ActiveInputs), " pending: ", len(player.PendingInputs))
	// Extrapolation of movement for a limited number of ticks
	if numUnacked < maxMotionPredictions {
		predicted.Left = player.LastInput.Left
		predicted.Right = player.LastInput.Right
		predicted.Up = player.LastInput.Up
		predicted.Down = player.LastInput.Down
	}

	player.ActiveInputs = append(player.ActiveInputs, predicted)
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

	numAcked := 0
	for i := range player.ActiveInputs {
		if player.ActiveInputs[i].Acked {
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
		encoder.WriteUint8(player.ActiveInputs[numAcked-1].ClientTick)
		player.ActiveInputs = player.ActiveInputs[numAcked:]
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
