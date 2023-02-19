package main

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/web"
)

// TODO
// - Predicted buffer will fill up if client running faster than server. Reconsider adding some throttling.
// - Client should probs start dropping world updates when minimised (otherwise they see million lasers spawned in)
// - TCP NODELAY, server and client
// - Generate a www/config.js from a config.go for shared parameters (tick rate, etc)
// - improve precision of ticker (sleep in smaller intervals?)
// - binary messages to save bandwidth
// - 32 bit float to save bandwidth
// - sanitise user input (assume bytes could be anything)
// - remove debug delay/jitter

// GRAPHICS IDEAS
// - 3d models rendered 2d, normal maps too
// - models should have an inner skeleton with different coloured/styled armour (like mobile suits)
// - global illumination based on surrounding ships/walls

func main() {
	conf.WriteSharedParams("www/shared.json")
	webserver := web.NewWebServer()
	game := NewGame(webserver.ClientC)
	go game.Run()
	logger.Error(webserver.Run())
}
