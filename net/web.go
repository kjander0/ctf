package net

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	connTimeout    = 10 * time.Second
	maxMessageSize = 1024
)

type WebServer struct {
	ClientC chan Client
}

type Client struct {
	Username string
	ReadC    chan []byte
	WriteC   chan []byte
}

type ClientMsg struct {
	Username string
}

var upgrader = websocket.Upgrader{}

func NewWebServer() WebServer {
	return WebServer{
		ClientC: make(chan Client, 10),
	}
}

func (ws *WebServer) Run() error {
	http.Handle("/", http.FileServer(http.Dir("www")))
	http.HandleFunc("/ws", ws.handleWs)
	return http.ListenAndServe(":8000", nil)
}

func NewClient() Client {
	return Client{ReadC: make(chan []byte), WriteC: make(chan []byte)}
}

func (ws *WebServer) handleWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		LogError("handleWs: upgrader.Upgrade: ", err)
		return
	}
	LogDebug("handleWs: new connection from: ", r.RemoteAddr)

	client := NewClient()

	go writePump(conn, client.WriteC)
	go readPump(conn, client.ReadC)

	// service in seperate goroutine so handler can complete
	go ws.serviceClient(client)
}

/*
Validate client before passing onto game logic
*/
func (ws *WebServer) serviceClient(client Client) {
	msgBytes, ok := <-client.ReadC
	if !ok {
		LogError("serviceClient: connection lost")
		close(client.WriteC)
		return
	}

	var inputMsg ClientMsg
	err := json.Unmarshal(msgBytes, &inputMsg)
	if err != nil {
		LogError("serviceClient: error decoding JSON")
		close(client.WriteC)
		return
	}

	client.Username = inputMsg.Username

	// pass ownership to game logic
	ws.ClientC <- client
}

/*
Gorilla WS require all read from same goroutine, so we do it here.
readC will be closed when the connection ends.
*/
func readPump(conn *websocket.Conn, readC chan []byte) {
	defer func() {
		LogDebug("readPump: closing")
		conn.Close()
		close(readC)
	}()

	conn.SetReadLimit(maxMessageSize)

	for {
		conn.SetPongHandler(
			func(string) error {
				return conn.SetReadDeadline(time.Now().Add(connTimeout))
			})

		err := conn.SetReadDeadline(time.Now().Add(connTimeout))
		if err != nil {
			LogError("SetReadDeadline: ", err)
			return
		}

		_, data, err := conn.ReadMessage()
		LogDebug("ws read data: ", data)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				LogError("readPump: unexpected websocket error: ", err)
			} else {
				LogDebug("readPump: ", err)
			}
			return
		}

		readTimer := time.NewTimer(connTimeout)
		select {
		case readC <- data:
		case <-readTimer.C:
			LogError("readPump: timeout on read channel")
			return
		}
	}
}

/*
Gorilla WS require all write from same goroutine, so we do it here
*/
func writePump(conn *websocket.Conn, writeC chan []byte) {
	defer func() {
		LogDebug("writePump: closing")
		conn.Close()
	}()

	for {
		data, ok := <-writeC
		if !ok { // writeChan closed
			conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		err := conn.SetWriteDeadline(time.Now().Add(connTimeout))
		if err != nil {
			LogError("SetWriteDeadline: ", err)
			return
		}

		err = conn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			LogError("writePump: WriteMessage: ", err)
			return
		}
	}
}
