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
	PlayerSpeed:      2.25,
	PlayerRadius:     32,
	PlayerHealth:     10,
	MaxLaserEnergy:   95,
	MaxBouncyEnergy:  270,
	JailTimeTicks:    75,
	LaserSpeed:       10,
	LaserTimeTicks:   60,
	LaserEnergyCost:  18,
	BouncyEnergyCost: 90,
	BouncySpeed:      15,
}

func WriteSharedParams(filePath string) {
	bytes, err := json.Marshal(Shared)
	if err != nil {
		logger.Panic("Failed to marshal shared params json")
	}
	os.WriteFile(filePath, bytes, 0644)
}
