package net

import (
	"bytes"
	"encoding/binary"

	"github.com/kjander0/ctf/mymath"
)

type Encoder struct {
	Buf   *bytes.Buffer
	Error error
}

func NewEncoder(buf *bytes.Buffer) Encoder {
	return Encoder{
		Buf: buf,
	}
}

func (e *Encoder) WriteUint8(val uint8) {
	if e.Error != nil {
		return
	}
	e.Error = e.Buf.WriteByte(val)
}

func (e *Encoder) WriteFloat64(val float64) {
	if e.Error != nil {
		return
	}
	e.Error = binary.Write(e.Buf, binary.BigEndian, val)
}

func (e *Encoder) WriteInt32(val int32) {
	if e.Error != nil {
		return
	}
	e.Error = binary.Write(e.Buf, binary.BigEndian, val)
}

func (e *Encoder) WriteVec(val mymath.Vec) {
	if e.Error != nil {
		return
	}

	e.Error = binary.Write(e.Buf, binary.BigEndian, val.X)
	if e.Error != nil {
		return
	}
	e.Error = binary.Write(e.Buf, binary.BigEndian, val.Y)
}

type Decoder struct {
	Buf   *bytes.Reader
	Error error
}

func NewDecoder(data []byte) Decoder {
	return Decoder{
		Buf: bytes.NewReader(data),
	}
}

func (d *Decoder) ReadUint8() uint8 {
	if d.Error != nil {
		return 0
	}

	var val uint8
	val, d.Error = d.Buf.ReadByte()
	return val
}

func (d *Decoder) ReadFloat64() float64 {
	if d.Error != nil {
		return 0
	}

	var val float64
	d.Error = binary.Read(d.Buf, binary.BigEndian, &val)
	return val
}

func (d *Decoder) ReadInt32() int32 {
	if d.Error != nil {
		return 0
	}

	var val int32
	d.Error = binary.Read(d.Buf, binary.BigEndian, &val)
	return val
}

func (d *Decoder) ReadVec() mymath.Vec {
	var val mymath.Vec

	if d.Error != nil {
		return val
	}

	d.Error = binary.Read(d.Buf, binary.BigEndian, &val.X)
	if d.Error != nil {
		return val
	}
	d.Error = binary.Read(d.Buf, binary.BigEndian, &val.Y)
	return val
}
