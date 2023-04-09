package conf

import (
	"encoding/json"
	"os"

	"github.com/kjander0/ctf/logger"
)

type SharedParams struct {
	TickRate         int
	TileSize         int
	PlayerSpeed      float64
	PlayerRadius     float64
	PlayerHealth     int
	MaxLaserEnergy   int
	MaxBouncyEnergy  int
	JailTimeTicks    int
	LaserSpeed       float64
	LaserTimeTicks   int
	LaserEnergyCost  int
	BouncyEnergyCost int
	BouncySpeed      float64
}

var Shared = SharedParams{
	TickRate:         30,
	TileSize:         32,
	PlayerSpeed:      2,
	PlayerRadius:     32,
	PlayerHealth:     10,
	MaxLaserEnergy:   70,
	MaxBouncyEnergy:  180,
	JailTimeTicks:    75,
	LaserSpeed:       10,
	LaserTimeTicks:   180,
	LaserEnergyCost:  10,
	BouncyEnergyCost: 60,
	BouncySpeed:      15,
}

func WriteSharedParams(filePath string) {
	bytes, err := json.Marshal(Shared)
	if err != nil {
		logger.Panic("Failed to marshal shared params json")
	}
	os.WriteFile(filePath, bytes, 0644)
}
