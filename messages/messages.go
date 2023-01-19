package messages

const (
	TileStateEmpty    = "empty"
	TileStateOccupied = "occupied"
)

type InputMsg struct {
	MsgType string
	Action  Action
}

type Action struct {
	ActionType string
}

type UpdateMsg struct {
	Map []Tile
}

type Tile struct {
	TileState int
}
