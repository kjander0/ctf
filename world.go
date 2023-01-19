package main

const (
	ActionMilitary = "military"
)

const gridSize = 10

type World struct {
	PlayerList []Player
	TileList   []Tile
}

type Player struct {
	Name string
}

type Tile struct {
	color int
}

func NewWorld() World {
	tiles := make([]Tile, gridSize*gridSize)
	for i := range tiles {
		tiles[i].color = i
	}

	return World{
		PlayerList: []Player{},
	}
}

func (w World) Update(name string, input InputMsg) World {
	playerIndex := -1
	for playerIndex = range w.PlayerList {
		if w.PlayerList[playerIndex].Name == name {
			break
		}
	}
	if playerIndex == -1 {
		w.PlayerList = append(w.PlayerList, Player{
			Name: name,
		})
		playerIndex = len(w.PlayerList) - 1
	}

	// switch action.ActionType {
	// case ActionMilitary:

	// }

	return w
}
