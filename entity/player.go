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
	TeamGreen = iota
	TeamRed
	TeamBlue
	TeamYellow
)

const (
	FlagCooldownTicks = 45
)

const (
	// TODO: these can be shared values if server prediction/correction is made to be the same
	maxPredictedInputs   = 300 // needs to be large enough to allow catchup of burst of delayed inputs
	maxMotionPredictions = 5   // too much motion extrapolation causes overshoot
)

type PlayerPredicted struct {
	Pos          mymath.Vec
	Energy       int
	BouncyEnergy int
}

type Player struct {
	Id                  uint8
	Team                int
	NetState            int
	State               int
	Client              web.Client
	Health              int
	Acked               PlayerPredicted
	Predicted           PlayerPredicted
	TicksSinceLastInput int
	ReceivedInputs      []PlayerInput
	LastInput           PlayerInput
	DoDisconnect        bool
	DoSpeedup           bool
	JailTimeTicks       int
	FlagCooldownTicks   int
	FlagIndex           int // -1 means no flag
}

type PlayerInput struct {
	Tick           uint8
	Left           bool
	Right          bool
	Up             bool
	Down           bool
	ShootPrimary   bool
	ShootSecondary bool
	DropFlag       bool
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

func NewPlayer(id uint8, team int, client web.Client) Player {
	acked := NewPlayerPredicted()
	predicted := NewPlayerPredicted()

	return Player{
		Id:             id,
		Team:           team,
		NetState:       PlayerNetStateJoining,
		State:          PlayerStateSpectating,
		Health:         conf.Shared.PlayerHealth,
		Acked:          acked,
		Predicted:      predicted,
		Client:         client,
		ReceivedInputs: make([]PlayerInput, 0, maxPredictedInputs),
		FlagIndex:      -1,
	}
}

func NewPlayerPredicted() PlayerPredicted {
	return PlayerPredicted{
		mymath.Vec{},
		conf.Shared.MaxLaserEnergy,
		conf.Shared.MaxBouncyEnergy,
	}
}

func UpdatePlayers(world *World) {
	world.NewLasers = world.NewLasers[:0]

	for i := range world.PlayerList {
		player := &world.PlayerList[i]

		if player.NetState != PlayerNetStateReady {
			continue
		}

		player.TicksSinceLastInput++ // increment once per tick, decrement for each input received

		if player.Health <= 0 {
			SendToJail(world, player)
		}

		if player.FlagCooldownTicks > 0 {
			player.FlagCooldownTicks -= 1
		}

		if player.State == PlayerStateJailed {
			player.JailTimeTicks -= 1
			if player.JailTimeTicks <= 0 {
				player.State = PlayerStateAlive
				switch player.Team {
				case TeamGreen:
					player.Acked.Pos = world.Map.RandomLocation(world.Map.GreenSpawns)
				case TeamRed:
					player.Acked.Pos = world.Map.RandomLocation(world.Map.RedSpawns)
				}
			}
		}

		processReceivedInputs(world, player)
		processPredictedInputs(world, player)
	}
}

func SendToJail(world *World, player *Player) {
	switch player.Team {
	case TeamGreen:
		player.Acked.Pos = world.Map.RandomLocation(world.Map.GreenJails)
	case TeamRed:
		player.Acked.Pos = world.Map.RandomLocation(world.Map.RedJails)
	}

	player.Health = conf.Shared.PlayerHealth
	player.JailTimeTicks = conf.Shared.JailTimeTicks
	player.State = PlayerStateJailed
}

func processReceivedInputs(world *World, player *Player) {
	numReceivedInputs := len(player.ReceivedInputs)
	if numReceivedInputs > player.TicksSinceLastInput {
		excessCount := numReceivedInputs - player.TicksSinceLastInput
		logger.Debug("Discarding ", excessCount, " additional inputs")
		player.ReceivedInputs = player.ReceivedInputs[excessCount:] // keep the most recent inputs
	}

	for _, input := range player.ReceivedInputs {
		player.TicksSinceLastInput--

		disp := calcDisplacement(input)
		player.Acked.Pos = player.Acked.Pos.Add(disp)
		player.Acked.Pos = constrainPlayerPos(world, player.Acked.Pos)

		if input.ShootPrimary || input.ShootSecondary {
			dir := mymath.Vec{X: math.Cos(input.AimAngle), Y: math.Sin(input.AimAngle)}
			laser := Laser{
				Type:     ProjTypeLaser,
				PlayerId: player.Id,
				Line: mymath.Line{
					Start: player.Acked.Pos,
					End:   player.Acked.Pos,
				},
				Dir:   dir,
				Angle: input.AimAngle,
			}
			if input.ShootPrimary && player.Acked.Energy >= conf.Shared.LaserEnergyCost {
				player.Acked.Energy -= conf.Shared.LaserEnergyCost
				world.NewLasers = append(world.NewLasers, laser)
			}
			if input.ShootSecondary && player.Acked.BouncyEnergy >= conf.Shared.BouncyEnergyCost {
				player.Acked.BouncyEnergy -= conf.Shared.BouncyEnergyCost
				laser.Type = ProjTypeBouncy
				world.NewLasers = append(world.NewLasers, laser)
			}
		}

		player.Acked.Energy = mymath.MinInt(conf.Shared.MaxLaserEnergy, player.Acked.Energy+1)
		player.Acked.BouncyEnergy = mymath.MinInt(conf.Shared.MaxBouncyEnergy, player.Acked.BouncyEnergy+1)
	}
}

func processPredictedInputs(world *World, player *Player) {
	player.Predicted = player.Acked

	if player.TicksSinceLastInput > maxPredictedInputs {
		logger.Debug("hit prediction limit")
		player.TicksSinceLastInput = maxPredictedInputs
	}

	// we might be approaching prediction limit because player tick has fallen behind, tell them to tick faster
	player.DoSpeedup = false
	if player.TicksSinceLastInput > maxPredictedInputs/2 {
		player.DoSpeedup = true
	}

	for i := 0; i < player.TicksSinceLastInput; i++ {
		var disp mymath.Vec
		if i < maxMotionPredictions {
			disp = calcDisplacement(player.LastInput)
			player.Predicted.Pos = player.Predicted.Pos.Add(disp)
			player.Predicted.Pos = constrainPlayerPos(world, player.Predicted.Pos)
		}
		player.Predicted.Energy = mymath.MinInt(conf.Shared.MaxLaserEnergy, player.Predicted.Energy+1)
		player.Predicted.BouncyEnergy = mymath.MinInt(conf.Shared.MaxBouncyEnergy, player.Predicted.BouncyEnergy+1)
	}
}

func constrainPlayerPos(world *World, pos mymath.Vec) mymath.Vec {
	// TODO: if pass in prev pos, can eliminate some collision checks
	tileSample := world.Map.SampleTiles(pos, conf.Shared.PlayerRadius, PlayerCollisionGroup)
	tileSize := float64(conf.Shared.TileSize)
	tileRect := mymath.Rect{Size: mymath.Vec{tileSize, tileSize}}
	playerCircle := mymath.Circle{Radius: conf.Shared.PlayerRadius}
	for _, tile := range tileSample {
		playerCircle.Pos = pos
		var overlaps bool
		var overlap mymath.Vec
		if tile.Type == TileTypeWall {
			tileRect.Pos = tile.Pos
			overlaps, overlap = mymath.CircleRectOverlap(playerCircle, tileRect)
		} else if tile.Type == TileTypeWallTriangle || tile.Type == TileTypeWallTriangleCorner {
			t0, t1, t2 := tile.CalcTrianglePoints()
			overlaps, overlap = mymath.CircleTriangleOverlap(playerCircle, t0, t1, t2)
		}

		if !overlaps {
			continue
		}
		pos = pos.Sub(overlap)
	}
	return pos
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
