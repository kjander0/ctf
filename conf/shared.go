package conf

import (
	"encoding/json"
	"os"

	"github.com/kjander0/ctf/logger"
)

type SharedParams struct {
	TickRate        int
	TileSize        int
	PlayerSpeed     float64
	PlayerRadius    float64
	PlayerHealth    int
	PlayerEnergy    int
	JailTimeTicks   int
	LaserSpeed      float64
	LaserTimeTicks  int
	LaserEnergyCost int
	BouncySpeed     float64
}

var Shared = SharedParams{
	TickRate:        30,
	TileSize:        32,
	PlayerSpeed:     2,
	PlayerRadius:    32,
	PlayerHealth:    10,
	PlayerEnergy:    60,
	JailTimeTicks:   300,
	LaserSpeed:      6,
	LaserTimeTicks:  45,
	LaserEnergyCost: 10,
	BouncySpeed:     8,
}

func WriteSharedParams(filePath string) {
	bytes, err := json.Marshal(Shared)
	if err != nil {
		logger.Panic("Failed to marshal shared params json")
	}
	os.WriteFile(filePath, bytes, 0644)
}
