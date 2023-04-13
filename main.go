package main

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/web"
)

// TODO
// - allocate all short lived javascript objects up front (Vec, Transform, Particle, Color, etc)
// - load assets in parallel with loading bar
// - consider using z-depth for layering sprites (maybe X number layers?)
// - draw lasers underneath tank
// - 9 sprites for tank movement
// - Predicted buffer will fill up if client running faster than server. Reconsider adding some throttling.
// - Client should probs start dropping world updates when minimised (otherwise they see million lasers spawned in)
// - TCP NODELAY, server and client
// - Generate a www/config.js from a config.go for shared parameters (tick rate, etc)
// - improve precision of ticker (sleep in smaller intervals?)
// - binary messages to save bandwidth
// - 32 bit float to save bandwidth
// - sanitise user input (assume bytes could be anything)
// - remove debug delay/jitter

// WEAPON IDEAS
// - shift to temporarily boost, draining laser energy
// - lock on homing missile
// - orbs with linking laser chain (maybe they wrap walls or orbs explode if laser touches something)
// - shotgun 4 lasers
// - flak, slow shell which explodes into multuple lasers

// GRAPHICS IDEAS
// - particles falling away from lasers (or maybe just special lasers to set them apart, i.e flak)
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
