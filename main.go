package main

// TODO
// - binary messages to save bandwidth
// - test with artificial delay, jitter, loss

func main() {
	webserver := NewWebServer()
	game := NewGame(webserver.ClientC)
	go game.Run()
	LogError(webserver.Run())
}
