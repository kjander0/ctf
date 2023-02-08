package entity

import (
	"math"

	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/web"
)

const (
	PlayerStateJoining = iota
	PlayerStateAlive
)

type Player struct {
	Id             uint8
	State          int
	Client         web.Client
	Pos            mymath.Vec
	PredictedPos   mymath.Vec
	PredictedInputs PredictedInputs
	LastInput      PlayerInput
	GotFirstInput  bool
	DoDisconnect   bool
}

type PlayerInput struct {
	Acked      bool
	ClientTick uint8
	Left       bool
	Right      bool
	Up         bool
	Down       bool
	DoShoot    bool
	AimAngle   float64
}

var dirMap = [3][3]int{
	{4, 3, 2},
	{5, 0, 1},
	{6, 7, 8},
}

func (in PlayerInput) GetDirNum() int {
	row := 1
	col := 1
	if in.Left {
		col -= 1
	}
	if in.Right {
		col += 1
	}
	if in.Up {
		row -= 1
	}
	if in.Down {
		row += 1
	}
	return dirMap[row][col]
}

func NewPlayer(id uint8, client web.Client) Player {
	return Player{
		Id:     id,
		State:  PlayerStateJoining,
		Client: client,
	}
}

func UpdatePlayers(world *World) {
	world.NewLasers = world.NewLasers[:0]
	for i := range world.PlayerList {
		player := &world.PlayerList[i]
		player.PredictedPos = player.Pos
		for _, input := range player.Inputs {
			movePlayer(player, input)
			spawnProjectile(world, player, input)
		}
	}
}

func movePlayer(player *Player, input PlayerInput) {
	disp := calcDisplacement(input)
	if input.Acked {
		player.Pos = player.Pos.Add(disp)
		player.PredictedPos = player.Pos
		return
	}
	player.PredictedPos = player.PredictedPos.Add(disp)
}

func spawnProjectile(world *World, player *Player, input PlayerInput) {
	if !input.DoShoot {
		return
	}

	dir := mymath.Vec{X: math.Cos(input.AimAngle), Y: math.Sin(input.AimAngle)}
	newLaser := Laser{
		player.Id,
		mymath.Line{
			Start: player.Pos,
			End:   player.Pos,
		},
		dir,
		input.AimAngle,
	}

	world.LaserList = append(world.LaserList, newLaser)
	world.NewLasers = append(world.NewLasers, &world.LaserList[len(world.LaserList)-1])
}

func calcDisplacement(input PlayerInput) mymath.Vec {
	// TODO: does it feel better if movement always occurs in direction of last pressed key (even if two opposing keys pressed)
	var dir mymath.Vec
	if input.Left {
		dir.X -= 1
	}
	if input.Right {
		dir.X += 1
	}
	if input.Up {
		dir.Y += 1
	}
	if input.Down {
		dir.Y -= 1
	}
	return dir.Scale(conf.Shared.PlayerSpeed)
}
