package web

import (
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/kjander0/ctf/logger"
)

const (
	connTimeout    = 10 * time.Second
	pingPeriod     = 5 * time.Second
	maxMessageSize = 1024
)

type WebServer struct {
	ClientC   chan Client
	fsHandler http.Handler
}

type Client struct {
	Username string
	ReadC    chan []byte
	WriteC   chan []byte
}

type ClientMsg struct {
	Data []byte
}

var upgrader = websocket.Upgrader{}

func NewWebServer() WebServer {
	return WebServer{
		ClientC:   make(chan Client, 10),
		fsHandler: http.FileServer(http.Dir("www")),
	}
}

func (ws *WebServer) Run() error {
	http.HandleFunc("/", ws.handleHttp)
	http.HandleFunc("/ws", ws.handleWs)
	return http.ListenAndServe(":8000", nil)
}

func NewClient() Client {
	return Client{
		ReadC:  make(chan []byte, 5), // buffered so we can detect throttle condition
		WriteC: make(chan []byte, 5), // buffered so we don't block game when writePump busy sending ping
	}
}

func (ws *WebServer) handleHttp(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-cache") // client must check for newer version of files every time
	ws.fsHandler.ServeHTTP(w, r)
}

func (ws *WebServer) handleWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("handleWs: upgrader.Upgrade: ", err)
		return
	}
	logger.Debug("handleWs: new connection from: ", r.RemoteAddr)

	client := NewClient()

	// BEGIN DEBUG delayed packets
	dRead := NewDelayChannel()
	dWrite := NewDelayChannel()
	client.ReadC = dRead.OutC
	client.WriteC = dWrite.InC
	go dRead.Start()
	go dWrite.Start()
	go writePump(conn, dWrite.OutC)
	go readPump(conn, dRead.InC)
	// END DEBUG delayed packets

	//go writePump(conn, client.WriteC)
	//go readPump(conn, client.ReadC)

	// service in seperate goroutine so handler can complete
	go ws.serviceClient(client)
}

/*
Validate client before passing onto game logic
*/
func (ws *WebServer) serviceClient(client Client) {
	// TODO: can read authentication/username here
	client.Username = "user"

	// pass ownership to game logic
	ws.ClientC <- client
}

/*
Gorilla WS require all read from same goroutine, so we do it here.
readC will be closed when the connection ends.
*/
func readPump(conn *websocket.Conn, readC chan []byte) {
	defer func() {
		logger.Debug("readPump: closing")
		conn.Close()
		close(readC)
	}()

	conn.SetReadLimit(maxMessageSize)

	for {
		conn.SetPongHandler(
			func(string) error {
				logger.Debug("PONG RECEIVED")
				return conn.SetReadDeadline(time.Now().Add(connTimeout))
			})

		err := conn.SetReadDeadline(time.Now().Add(connTimeout))
		if err != nil {
			logger.Error("SetReadDeadline: ", err)
			return
		}

		wsMsgType, data, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error("readPump: unexpected websocket error: ", err)
			} else {
				logger.Debug("readPump: ", err)
			}
			return
		}

		if wsMsgType != websocket.BinaryMessage {
			logger.Error("readPump: unsupported websocket message type: ", wsMsgType)
			return
		}

		readTimer := time.NewTimer(connTimeout)
		select {
		case readC <- data:
		case <-readTimer.C:
			logger.Error("readPump: timeout on read channel")
			return
		}
	}
}

/*
Gorilla WS require all write from same goroutine, so we do it here
*/
func writePump(conn *websocket.Conn, writeC chan []byte) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		logger.Debug("writePump: closing")
		ticker.Stop()
		conn.Close()
	}()

	for {
		select {
		case data, ok := <-writeC:
			if !ok { // writeChan closed
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := conn.SetWriteDeadline(time.Now().Add(connTimeout))
			if err != nil {
				logger.Error("SetWriteDeadline: ", err)
				return
			}
			err = conn.WriteMessage(websocket.BinaryMessage, data)
			if err != nil {
				logger.Error("writePump: WriteMessage: ", err)
				return
			}

		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(connTimeout))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				logger.Error("writePump: ping: ", err)
				return
			}
		}
	}
}
