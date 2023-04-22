package net

import (
	"bytes"

	"github.com/kjander0/ctf/conf"
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
	maxReadsPerTick = 10
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
	shootFlagBit     = 1
	secondaryFlagBit = 2
)

// Flags from server
const (
	ackInputFlagBit = 1
	speedupFlagBit  = 2
)

func ReceiveMessages(world *entity.World) {
	for i := range world.PlayerList {
		processMessages(world, &world.PlayerList[i])
	}
}

// Read and process a message from a player. Returns True if their could be more messages.
func processMessages(world *entity.World, player *entity.Player) {
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
			if player.NetState == entity.PlayerNetStateWaitingForInput {
				player.State = entity.PlayerStateJailed
				if player.Team == entity.TeamGreen {
					player.Acked.Pos = world.Map.RandomLocation(world.Map.GreenJails)
				} else {
					player.Acked.Pos = world.Map.RandomLocation(world.Map.RedJails)
				}
				player.NetState = entity.PlayerNetStateReady
				player.JailTimeTicks = conf.Shared.JailTimeTicks
			}
		default:
			logger.Error("ReceiveInputs: bad msg type: ", msgType)
			player.DoDisconnect = true
			return
		}
	}
}

func processInputMsg(player *entity.Player, decoder Decoder) {
	flags := decoder.ReadUint8()
	var newInputState entity.PlayerInput

	newInputState.Tick = decoder.ReadUint8()

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
		newInputState.ShootPrimary = true
	}

	if (flags & secondaryFlagBit) == secondaryFlagBit {
		newInputState.ShootSecondary = true
	}

	if newInputState.ShootPrimary || newInputState.ShootSecondary {
		newInputState.AimAngle = decoder.ReadFloat64()
	}

	if decoder.Error != nil {
		logger.Error("ReceiveInputs: decoder error: ", decoder.Error)
		player.DoDisconnect = true
		return
	}

	player.LastInput = newInputState

	player.ReceivedInputs = append(player.ReceivedInputs, newInputState)
}

// Sends world state to all players
func SendMessages(world *entity.World) error {
	// TODO: Encode snap shot of entities once. Store unacked snapshots for each entity. Send only delta between
	// latest snapshot and last acked snapshot. Could delta per-byte and use bitflag to tell which bytes changed
	for i := range world.PlayerList {
		var msgBytes []byte
		switch world.PlayerList[i].NetState {
		case entity.PlayerNetStateJoining:
			msgBytes = prepareInitMsg(world, i)
			world.PlayerList[i].NetState = entity.PlayerNetStateWaitingForInput
		case entity.PlayerNetStateWaitingForInput:
			fallthrough
		case entity.PlayerNetStateReady:
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
	// TODO: encode map tiles once (possibly compressed), send to all players that join
	encoder.WriteUint16(uint16(len(world.Map.Rows)))
	for i := range world.Map.Rows {
		encoder.WriteUint16(uint16(len(world.Map.Rows[i])))
		for j := range world.Map.Rows[i] {
			encoder.WriteUint8(world.Map.Rows[i][j].Type)
		}
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

	if player.DoSpeedup {
		flags |= speedupFlagBit
	}

	doAck := len(player.ReceivedInputs) > 0

	if doAck {
		flags |= ackInputFlagBit
	}

	encoder.WriteUint8(stateUpdateMsgType)
	encoder.WriteUint8(flags)
	encoder.WriteUint8(world.Tick)

	if doAck {
		encoder.WriteUint8(uint8(player.LastInput.Tick))
	}

	player.ReceivedInputs = player.ReceivedInputs[:0]

	encoder.WriteUint8(uint8(player.State))
	logger.Debug("flag index: ", player.FlagIndex)
	encoder.WriteInt8(int8(player.FlagIndex))
	encoder.WriteVec(player.Acked.Pos)
	encoder.WriteUint16(uint16(player.Acked.Energy))
	encoder.WriteUint16(uint16(player.Acked.BouncyEnergy))

	encoder.WriteUint8(uint8(len(world.PlayerList) - 1))
	for i := range world.PlayerList {
		if i == playerIndex {
			continue
		}
		encoder.WriteUint8(world.PlayerList[i].Id)
		encoder.WriteUint8(uint8(world.PlayerList[i].State))
		encoder.WriteVec(world.PlayerList[i].Predicted.Pos)
		encoder.WriteUint8(uint8(world.PlayerList[i].LastInput.GetDirNum()))
	}

	var numNewLasers uint16
	numLasersOffset := encoder.Offset
	encoder.WriteUint16(0) // placeholder number of new lasers
	for i := range world.NewLasers {
		laser := world.NewLasers[i]
		encoder.WriteUint8(laser.Type)
		encoder.WriteUint8(laser.PlayerId)
		encoder.WriteVec(laser.Line.Start)
		encoder.WriteVec(laser.Line.End)
		encoder.WriteFloat64(laser.Angle)
		numNewLasers += 1
	}
	encoder.WriteUint16At(numNewLasers, numLasersOffset)

	encoder.WriteUint16(uint16(len(world.NewHits)))
	for i := range world.NewHits {
		encoder.WriteVec(world.NewHits[i])
	}

	encoder.WriteUint8(uint8(len(world.FlagList)))
	for i := range world.FlagList {
		encoder.WriteVec(world.FlagList[i].Pos)
	}

	if encoder.Error != nil {
		logger.Panic("prepareWorldUpdate: encoder error: ", encoder.Error)
	}

	return buf.Bytes()
}
