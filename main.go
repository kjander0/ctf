package main

import (
	"github.com/kjander0/ctf/logger"
	"github.com/kjander0/ctf/net"
)

// TODO
// - binary messages to save bandwidth
// - 32 bit float to save bandwidth
// - test with artificial delay, jitter, loss

func main() {
	webserver := net.NewWebServer()
	game := NewGame(webserver.ClientC)
	go game.Run()
	logger.Error(webserver.Run())
}
