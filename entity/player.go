package entity

import (
	"math"

	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/web"
)

const (
	PlayerNetStateJoining = iota
	PlayerNetStateWaitingForInput
	PlayerNetStateReady
)

const (
	PlayerStateSpectating = iota
	PlayerStateJailed
	PlayerStateAlive
)

const (
	// TODO: these can be shared values if server prediction/correction is made to be the same
	maxPredictedInputs   = 60 // needs to be large enough to allow catchup of burst of delayed inputs
	maxMotionPredictions = 5  // too much motion extrapolation causes overshoot
)

type Player struct {
	Id              uint8
	NetState        int
	State           int
	Client          web.Client
	Health          int
	Energy          int
	Pos             mymath.Vec
	PredictedPos    mymath.Vec
	PredictedInputs PredictedInputs
	LastInput       PlayerInput
	DoDisconnect    bool
	JailTimeTicks   int
}

type PlayerInput struct {
	Left           bool
	Right          bool
	Up             bool
	Down           bool
	ShootPrimary   bool
	ShootSecondary bool
	AimAngle       float64
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
		Id:              id,
		NetState:        PlayerNetStateJoining,
		State:           PlayerStateSpectating,
		Health:          conf.Shared.PlayerHealth,
		Energy:          conf.Shared.PlayerEnergy,
		Pos:             mymath.Vec{},
		Client:          client,
		PredictedInputs: NewPredictedInputs(maxPredictedInputs),
	}
}

func UpdatePlayers(world *World) {
	world.NewLasers = world.NewLasers[:0]

	for i := range world.PlayerList {
		player := &world.PlayerList[i]

		if player.NetState != PlayerNetStateReady {
			continue
		}

		if player.State == PlayerStateJailed {
			player.JailTimeTicks -= 1
			if player.JailTimeTicks <= 0 {
				player.State = PlayerStateAlive
				player.Pos = world.Map.RandomSpawnLocation()
			}
		}

		processAckedInputs(world, player)
		processPredictedInputs(world, player)
		predictNextInput(world, player)

		player.Energy = mymath.MinInt(conf.Shared.PlayerEnergy, player.Energy+1)
	}
}

func processAckedInputs(world *World, player *Player) {
	for _, input := range player.PredictedInputs.Acked {
		disp := calcDisplacement(input)
		player.Pos = player.Pos.Add(disp)
		player.Pos = constrainPlayerPos(world, player.Pos)

		if !input.ShootPrimary && !input.ShootSecondary {
			continue
		}

		dir := mymath.Vec{X: math.Cos(input.AimAngle), Y: math.Sin(input.AimAngle)}
		laser := Laser{
			Type:     ProjTypeLaser,
			PlayerId: player.Id,
			Line: mymath.Line{
				Start: player.Pos,
				End:   player.Pos,
			},
			Dir:   dir,
			Angle: input.AimAngle,
		}

		if input.ShootPrimary && player.Energy >= conf.Shared.LaserEnergyCost {
			player.Energy -= conf.Shared.LaserEnergyCost
			world.NewLasers = append(world.NewLasers, laser)
		}
		if input.ShootSecondary {
			laser.Type = ProjTypeBouncy
			world.NewLasers = append(world.NewLasers, laser)
		}
	}
}

func processPredictedInputs(world *World, player *Player) {
	player.PredictedPos = player.Pos

	for _, prediction := range player.PredictedInputs.Predicted {
		disp := calcDisplacement(prediction.input)
		player.PredictedPos = player.PredictedPos.Add(disp)
		player.PredictedPos = constrainPlayerPos(world, player.PredictedPos)
	}
}

func constrainPlayerPos(world *World, pos mymath.Vec) mymath.Vec {
	// TODO: if pass in prev pos, can eliminate some collision checks
	tileSample := world.Map.SampleSolidTiles(pos, conf.Shared.PlayerRadius)
	tileSize := float64(conf.Shared.TileSize)
	tileRect := mymath.Rect{Size: mymath.Vec{tileSize, tileSize}}
	playerCircle := mymath.Circle{Radius: conf.Shared.PlayerRadius}
	for _, tilePos := range tileSample {
		playerCircle.Pos = pos
		tileRect.Pos = tilePos
		overlaps, overlap := mymath.CircleRectOverlap(playerCircle, tileRect)
		if !overlaps {
			continue
		}
		pos = pos.Add(overlap)
	}
	return pos
}

func predictNextInput(world *World, player *Player) {
	// Predict next ticks input
	predicted := PlayerInput{}
	// Extrapolation of movement for a limited number of ticks
	numPredicted := len(player.PredictedInputs.Predicted)
	if numPredicted < maxMotionPredictions {
		predicted.Left = player.LastInput.Left
		predicted.Right = player.LastInput.Right
		predicted.Up = player.LastInput.Up
		predicted.Down = player.LastInput.Down
	} else {
		logger.Debug("reached motion prediction limit")
	}
	player.PredictedInputs.Predict(predicted, world.Tick+1)
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
	len := dir.Length()
	if len < 1e-6 {
		return dir
	}
	return dir.Scale(conf.Shared.PlayerSpeed / len)
}
