package conf

import (
	"encoding/json"
	"os"

	"github.com/kjander0/ctf/logger"
)

type SharedParams struct {
	TickRate    int
	PlayerSpeed float64
	LaserSpeed  float64
}

var Shared = SharedParams{
	TickRate:    30,
	PlayerSpeed: 2,
	LaserSpeed:  7,
}

func WriteSharedParams(filePath string) {
	bytes, err := json.Marshal(Shared)
	if err != nil {
		logger.Panic("Failed to marshal shared params json")
	}
	os.WriteFile(filePath, bytes, 0644)
}
