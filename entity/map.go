package entity

import (
	"encoding/binary"
	"io"
	"math/rand"
	"os"

	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
)

var PlayerCollisionGroup = 1
var LaserCollisionGroup = 2

type TileType struct {
	Id             int
	Team           int
	CollisionGroup int
	// Shape CollisionShape
}

var typeList []*TileType
var nextTileTypeId = 0

func NewTileType() *TileType {
	tt := &TileType{
		Id:             nextTileTypeId,
		Team:           -1,
		CollisionGroup: PlayerCollisionGroup | LaserCollisionGroup,
	}
	nextTileTypeId += 1
	typeList = append(typeList, tt)
	return tt
}

var TileTypeEmpty = NewTileType()
var TileTypeFloor = NewTileType()
var TileTypeWall = NewTileType()
var TileTypeWallTriangle = NewTileType()
var TileTypeWallTriangleCorner = NewTileType()

var TileTypeGreenSpawn = NewTileType()
var TileTypeRedSpawn = NewTileType()
var TileTypeBlueSpawn = NewTileType()
var TileTypeYellowSpawn = NewTileType()

var TileTypeGreenJail = NewTileType()
var TileTypeRedJail = NewTileType()
var TileTypeBlueJail = NewTileType()
var TileTypeYellowJail = NewTileType()

var TileTypeGreenFlagGoal = NewTileType()
var TileTypeRedFlagGoal = NewTileType()
var TileTypeBlueFlagGoal = NewTileType()
var TileTypeYellowFlagGoal = NewTileType()

var TileTypeFlagSpawn = NewTileType()

func DefineTileTypes() {
	if len(typeList) > 0 {
		logger.Panic("Tiles types have already been defined")
	}

	TileTypeGreenSpawn.Team = TeamGreen
	TileTypeGreenSpawn.CollisionGroup = 0
	TileTypeRedSpawn.Team = TeamRed
	TileTypeRedSpawn.CollisionGroup = 0
	TileTypeBlueSpawn.Team = TeamBlue
	TileTypeBlueSpawn.CollisionGroup = 0
	TileTypeYellowSpawn.Team = TeamYellow
	TileTypeYellowSpawn.CollisionGroup = 0

	TileTypeGreenJail.Team = TeamGreen
	TileTypeGreenSpawn.CollisionGroup = 0
	TileTypeRedJail.Team = TeamRed
	TileTypeRedJail.CollisionGroup = 0
	TileTypeBlueJail.Team = TeamBlue
	TileTypeBlueJail.CollisionGroup = 0
	TileTypeYellowJail.Team = TeamYellow
	TileTypeYellowJail.CollisionGroup = 0

	TileTypeGreenFlagGoal.Team = TeamGreen
	TileTypeGreenFlagGoal.CollisionGroup = 0
	TileTypeRedFlagGoal.Team = TeamRed
	TileTypeRedFlagGoal.CollisionGroup = 0
	TileTypeBlueFlagGoal.Team = TeamBlue
	TileTypeBlueFlagGoal.CollisionGroup = 0
	TileTypeYellowFlagGoal.Team = TeamYellow
	TileTypeYellowFlagGoal.CollisionGroup = 0
}

type Tile struct {
	Type *TileType
	Pos  mymath.Vec

	// CCW orientation of base of triangle tiles
	//   2
	// 3 /\ 1
	//   0
	Orientation uint8
}

type Map struct {
	Rows           [][]Tile
	GreenJails     []mymath.Vec
	RedJails       []mymath.Vec
	GreenSpawns    []mymath.Vec
	RedSpawns      []mymath.Vec
	FlagSpawns     []mymath.Vec
	GreenFlagGoals []mymath.Vec
	RedFlagGoals   []mymath.Vec
}

func LoadMap(filename string) *Map {
	file, err := os.Open(filename)
	if err != nil {
		// TODO: test this error
		logger.Panic("File not found: ", filename)
	}
	defer file.Close()

	var rowSize uint16
	err = binary.Read(file, binary.BigEndian, &rowSize)
	if err != nil {
		logger.Panic("Failed to read rowSize from file: ", filename)
	}
	logger.Debug("row size: ", rowSize)

	newMap := &Map{}
	newMap.Rows = append(newMap.Rows, []Tile{})
	for {
		var bits uint16
		err = binary.Read(file, binary.BigEndian, &bits)
		if err == io.EOF {
			break
		} else if err != nil {
			logger.Panic("Failed to read from file: ", filename)
		}

		tileCount := (bits & ^(^0 << 5)) + 1
		bits >>= 5
		variation := bits & ^(^0 << 4)
		bits >>= 4
		orientation := bits & ^(^0 << 2)
		bits >>= 2
		typeId := bits & ^(^0 << 5)

		logger.Debugf("tile count: %v variation: %v orientation: %v typeId: %v", tileCount, variation, orientation, typeId)

		for i := uint16(0); i < tileCount; i++ {
			row := newMap.Rows[len(newMap.Rows)-1]
			if len(row) == int(rowSize) {
				row = []Tile{}
				newMap.Rows = append(newMap.Rows, row)
			}
			rowIndex := len(newMap.Rows) - 1
			colIndex := len(row)
			tileType := typeList[typeId]
			row = append(row, Tile{
				Type:        tileType,
				Pos:         TileBottomLeft(rowIndex, colIndex),
				Orientation: uint8(orientation),
			})

			switch tileType {
			case TileTypeGreenJail:
				newMap.GreenJails = append(newMap.GreenJails, TileCentre(rowIndex, colIndex))
			case TileTypeRedJail:
				newMap.RedJails = append(newMap.RedJails, TileCentre(rowIndex, colIndex))
			case TileTypeGreenSpawn:
				newMap.GreenSpawns = append(newMap.GreenSpawns, TileCentre(rowIndex, colIndex))
			case TileTypeRedSpawn:
				newMap.RedSpawns = append(newMap.RedSpawns, TileCentre(rowIndex, colIndex))
			case TileTypeFlagSpawn:
				newMap.FlagSpawns = append(newMap.FlagSpawns, TileCentre(rowIndex, colIndex))
			case TileTypeGreenFlagGoal:
				newMap.GreenFlagGoals = append(newMap.GreenFlagGoals, TileCentre(rowIndex, colIndex))
			case TileTypeRedFlagGoal:
				newMap.RedFlagGoals = append(newMap.RedFlagGoals, TileCentre(rowIndex, colIndex))
			}
		}
	}

	return newMap
}

func (m *Map) RandomLocation(locations []mymath.Vec) mymath.Vec {
	return locations[rand.Intn(len(locations))]
}

func (m *Map) SampleTiles(pos mymath.Vec, radius float64, collisionGroup int) []Tile {
	tileSize := float64(conf.Shared.TileSize)
	col := int(pos.X / tileSize)
	row := int(pos.Y / tileSize)
	steps := int(radius/tileSize) + 1
	samples := make([]Tile, 0, (1+2*steps)*(1+2*steps))
	for r := row - steps; r <= row+steps; r++ {
		for c := col - steps; c <= col+steps; c++ {
			if r < 0 || r >= len(m.Rows) || c < 0 || c >= len(m.Rows[r]) {
				continue
			}
			tile := m.Rows[r][c]
			if collisionGroup&tile.Type.CollisionGroup == 0 {
				continue
			}
			samples = append(samples, tile)
		}
	}
	return samples
}

func (t Tile) CalcTrianglePoints() (mymath.Vec, mymath.Vec, mymath.Vec) {
	var p0, p1, p2 mymath.Vec
	tileSize := float64(conf.Shared.TileSize)
	if t.Type == TileTypeWallTriangle {
		switch t.Orientation {
		case 0:
			p0 = t.Pos
			p1 = t.Pos.AddXY(tileSize, 0)
			p2 = t.Pos.AddXY(tileSize/2, tileSize/2)
		case 1:
			p0 = t.Pos.AddXY(tileSize, 0)
			p1 = t.Pos.AddXY(tileSize, tileSize)
			p2 = t.Pos.AddXY(tileSize/2, tileSize/2)
		case 2:
			p0 = t.Pos.AddXY(tileSize, tileSize)
			p1 = t.Pos.AddXY(0, tileSize)
			p2 = t.Pos.AddXY(tileSize/2, tileSize/2)
		case 3:
			p0 = t.Pos.AddXY(0, tileSize)
			p1 = t.Pos
			p2 = t.Pos.AddXY(tileSize/2, tileSize/2)
		}
	} else if t.Type == TileTypeWallTriangleCorner {
		switch t.Orientation {
		case 0:
			p0 = t.Pos
			p1 = t.Pos.AddXY(tileSize, 0)
			p2 = t.Pos.AddXY(0, tileSize)
		case 1:
			p0 = t.Pos.AddXY(tileSize, 0)
			p1 = t.Pos.AddXY(tileSize, tileSize)
			p2 = t.Pos
		case 2:
			p0 = t.Pos.AddXY(tileSize, tileSize)
			p1 = t.Pos.AddXY(0, tileSize)
			p2 = t.Pos.AddXY(tileSize, 0)
		case 3:
			p0 = t.Pos.AddXY(0, tileSize)
			p1 = t.Pos
			p2 = t.Pos.AddXY(tileSize, tileSize)
		}
	} else {
		logger.Panic("triangle tile was expected")
	}
	return p0, p1, p2
}

func TileCentre(row int, col int) mymath.Vec {
	return mymath.Vec{float64(col) + 0.5, float64(row) + 0.5}.Scale(float64(conf.Shared.TileSize))
}

func TileBottomLeft(row int, col int) mymath.Vec {
	return mymath.Vec{float64(col), float64(row)}.Scale(float64(conf.Shared.TileSize))
}
