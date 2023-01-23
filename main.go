package main

import "github.com/kjander0/ctf/net"

// TODO
// - binary messages to save bandwidth
// - test with artificial delay, jitter, loss

func main() {
	webserver := net.NewWebServer()
	game := NewGame(webserver.ClientC)
	go game.Run()
	LogError(webserver.Run())
}
