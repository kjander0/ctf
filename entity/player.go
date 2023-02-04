package entity

import (
	"math"

	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/mymath"
	"github.com/kjander0/ctf/web"
)

const (
	PlayerSpeed = 2.5
)

type Player struct {
	Id            uint8
	Client        web.Client
	Pos           mymath.Vec
	PredictedPos  mymath.Vec
	ActiveInputs  []PlayerInput
	PendingInputs []PlayerInput
	LastInput     PlayerInput
	GotFirstInput bool
	DoDisconnect  bool
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

func NewPlayer(id uint8, client web.Client) Player {
	return Player{
		Id:     id,
		Client: client,
	}
}

func UpdatePlayers(world *World) {
	world.NewLasers = world.NewLasers[:0]
	for i := range world.PlayerList {
		player := &world.PlayerList[i]
		player.PredictedPos = player.Pos
		for _, input := range player.ActiveInputs {
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
	// TODO: CANT TRUST ClientTick!!! (they could set to anything, even more reason to limit or remove completely fast forwarding here)
	// Compensate for shooter's lag by fast forwarding the end point of the laser
	serverTick := int(world.Tick)
	clientTick := int(input.ClientTick)
	if serverTick < clientTick { // server tick has wrapped and client tick has not
		serverTick += 256
	}
	// TODO limit tick difference so we arn't teleporting lasers too dramatically.
	// Maybe no fast forwarding for fired laser, no prediction either.
	tickDiff := serverTick - clientTick
	logger.Debug("tickdiff ", tickDiff)
	for j := 0; j < tickDiff; j += 1 {
		newLaser.Line.End = newLaser.Line.End.Add(newLaser.Dir.Scale(LaserSpeed))
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
	return dir.Scale(PlayerSpeed)
}
