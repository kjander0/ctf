package main

type Player struct {
	Pos    Vec
	Client Client
}

func NewPlayer(client Client) Player {
	return Player{
		Client: client,
	}
}
