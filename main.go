package main

// TODO
// - binary messages to save bandwidth

func main() {
	webserver := NewWebServer()
	game := NewGame(webserver.ClientC)
	go game.Run()
	LogError(webserver.Run())
}
