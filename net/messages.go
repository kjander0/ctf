package net

import (
	"bytes"
	"encoding/binary"
	"log"
)

// Logic for syncing positional entities/event

const (
	InputMsgType       uint8 = 0
	StateUpdateMsgType uint8 = 1
)

type Message struct {
	buf bytes.Buffer
}

func NewMessage(msgType uint8) {
	var msg Message
	msg.buf.WriteByte(msgType)
}

func (msg *Message) writeFloat64(val float64) {
	binary.Write(&msg.buf, binary.BigEndian, val)
}

func (s *SyncInt32) encode(force bool) []byte {
	if !force && *s.valuePtr == s.prevValue {
		return nil
	}

	if s.buf.Len() == 0 {
		binary.Write(&s.buf, binary.BigEndian, s.valuePtr)
	}
	return s.buf.Bytes()
}

func (s *SyncInt32) update() {
	s.prevValue = *s.valuePtr
	s.buf.Reset()
}

func (s *SyncVec) encode(force bool) []byte {
	if !force && *s.valuePtr == s.prevValue {
		return nil
	}

	if s.buf.Len() == 0 {
		binary.Write(&s.buf, binary.BigEndian, s.valuePtr.X)
		binary.Write(&s.buf, binary.BigEndian, s.valuePtr.Y)
	}
	return s.buf.Bytes()
}

func (n *NetSync) prepareUpdateEntitiesMsg(buf *bytes.Buffer) bool {
	buf.Reset()

	err := binary.Write(buf, binary.BigEndian, updateEntitiesMsgType)
	if err != nil {
		log.Panic("error writing msg type")
	}

	hasContent := false
	for _, entity := range n.entityList {
		if entity.attrMask == 0 {
			continue
		}
		hasContent = true
		err = binary.Write(buf, binary.BigEndian, entity.Id)
		if err != nil {
			log.Panic("error writing entity id")
		}

		err = binary.Write(buf, binary.BigEndian, entity.attrMask)
		if err != nil {
			log.Panic("error writing entity attr mask")
		}

		for _, attr := range entity.attribs {
			bytes := attr.encode(false)
			if bytes != nil {
				err = binary.Write(buf, binary.BigEndian, bytes)
				if err != nil {
					log.Panic("error writing attrib")
				}
			}
		}
	}

	return hasContent
}
