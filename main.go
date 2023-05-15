package main

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/entity"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/web"
)

// TODO
// - handle case of particle texture being full (max number emitters)
//		- probs best to just override an existing emitter
// - prevent bouncy lasers from being shot into edge between tiles (bouncing forever and crashing client or server)
// - blit frame buffers to screen instead of drawing fullscreen quad
// - file bug report texture arrays firefox
// - optimize by choosing more appropriate VBO usage hint
// - add team mate collisions (does no damage but bullet dissapears)
// - if you temporarily minimise tab motion prediction limit is reached. And it stays that way even once you return.
// - handle user leaving tab (updates stop being called), maybe ignore net updates during this time and reset predicted buffers etc
// - tune max predictions on client and server to good values
// - display fps, ping, packet drop (+- stddev)
// - allocate all short lived javascript objects up front (Vec, Transform, Particle, Color, etc)
// - load assets in parallel with loading bar
// - consider using z-depth for layering sprites (maybe X number layers?)
// - single texture atlas for everything
// - draw lasers underneath tank
// - 9 sprites for tank movement
// - load assets in parallel
// - Predicted buffer will fill up if client running faster than server. Reconsider adding some throttling.
// - Client should probs start dropping world updates when minimised (otherwise they see million lasers spawned in)
// - TCP NODELAY, server and client
// - Generate a www/config.js from a config.go for shared parameters (tick rate, etc)
// - improve precision of ticker (sleep in smaller intervals?)
// - binary messages to save bandwidth
// - Use Float32Array, IntArray buffers for mesh data instead of making a full copy each upload
// - 32 bit float to save bandwidth
// - sanitise user input (assume bytes could be anything)
// - remove debug delay/jitter
// - run release build in production!
// - use integer textures for particles to improve performance and break dependency on RGBA float texture extension
// - verify client/server lasers at same position for each tick
//  	- test edge cases like shooting into edges between two tiles

// MVP FEATURES
// - choose name (appears below player)
// - stats (kills, deaths, assists)
// - king of the hill, or ctf goal

// GAME IDEAS
// - swept raycast to calculate light volume so e.g. back side or occluded walls arn't lit up
// - shift to temporarily boost, draining laser energy
// - lock on homing missile
// - orbs with linking laser chain (maybe they wrap walls or orbs explode if laser touches something)
// - shotgun 4 lasers
// - flak/firework, slow shell which explodes into multuple lasers
// - tiles that can be opened or destroyed
// - slower when carrying flags, but perhaps primary laser gets stronger?
// - power crystal flag that hovers behind player

// GRAPHICS IDEAS
// - draw tiles from slight angle (e.g. if from slightly above, then draw top to bottom overlaping so lower tiles cover wall of higher tiles)
// - texMeshMap is flawed (compares Texture and not glTexture, even though glTexture could be shared by multiple Texture)
// 		- probs a better way to avoid texture rebinding (sorting!)
// - consider y-flipping all textures using createImageBitmap() (current way of flipping vertical texture coord is probs best tho)
// - clamp textures now that they are in atlas
// - use proper VBO streaming methods for dynamic stuff (player sprite, particles, etc)
// - Can draw things like flag goal larger than one tile (draw on top of floor tiles)
// - half thickness walls (would require corner and intersection variations)
// - after being destroyed, particles could come together to reform tank in jail (electricity effects, etc)
// - improve static tile rendering performance by filling vbo with all tiles once and reuse vbo
// - reduce floor tile repeating by rendering floor tile larger (across multiple tiles)
//   - and add some tweaked floor tiles (vents, shell crater damage)
//   - can blend randomly oriented, larger crack tiles over a number of floor tiles
// - particles falling away from lasers (or maybe just special lasers to set them apart, i.e flak)
// - 3d models rendered 2d, normal maps too
// - models should have an inner skeleton with different coloured/styled armour (like mobile suits)
// - global illumination by sampling previous rendered frame OR from surrounding walls/floors

func main() {
	conf.WriteSharedParams("www/shared.json")
	webserver := web.NewWebServer()
	gameMap := entity.LoadMap("www/assets/maps/test.bin")
	game := NewGame(webserver.ClientC, gameMap)
	go game.Run()
	logger.Error(webserver.Run())
}
