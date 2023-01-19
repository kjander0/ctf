package main

func main() {
	webserver := NewWebServer()
	game := NewGame(webserver.ClientC)
	go game.run()
	logError(webserver.run())
}
