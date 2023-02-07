package entity

const (
	Empty = 0
	Solid = iota
)

type Level struct {
	Rows [][]uint8
}
