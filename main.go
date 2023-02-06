package main

import (
	"github.com/kjander0/ctf/conf"
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/web"
)

// TODO
// - TCP NODELAY, server and client
// - Generate a www/config.js from a config.go for shared parameters (tick rate, etc)
// - improve precision of ticker (sleep in smaller intervals?)
// - binary messages to save bandwidth
// - 32 bit float to save bandwidth
// - test with artificial delay, jitter, loss
// - sanitise user input (assume bytes could be anything)
// - remove debug delay/jitter

func main() {
	conf.WriteSharedParams("www/shared.json")
	webserver := web.NewWebServer()
	game := NewGame(webserver.ClientC)
	go game.Run()
	logger.Error(webserver.Run())
}
