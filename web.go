package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	pongWait       = 60 * time.Second
	writeWait      = 60 * time.Second
	maxMessageSize = 1024
)

type WebServer struct {
	ClientC       chan Client
	loginSessions map[string]Session
	sessionsMutex sync.Mutex
}

type Client struct {
	Username string
	ReadC    chan []byte
	WriteC   chan []byte
}

type Session struct {
	Token string
}

type AuthResponse struct {
	Token string
}

type InputMsg struct {
	Token    string
	Username string
}

var testUsers = map[string]string{
	"kieren": "password",
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func NewWebServer() WebServer {
	return WebServer{
		ClientC:       make(chan Client, 10),
		loginSessions: map[string]Session{},
	}
}

func (ws *WebServer) run() error {
	http.Handle("/", http.FileServer(http.Dir("www")))
	http.HandleFunc("/auth", ws.handleAuth)
	http.HandleFunc("/ws", ws.handleWs)
	return http.ListenAndServe(":8000", nil)
}

func NewClient() Client {
	return Client{ReadC: make(chan []byte, 10), WriteC: make(chan []byte, 10)}
}

func (ws *WebServer) handleAuth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Bad HTTP method", 400)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")
	if username == "" || password == "" {
		http.Error(w, "Missing username/password", http.StatusBadRequest)
		return
	}

	// TODO check hashed salted password in a database
	if password != testUsers[username] {
		http.Error(w, "Wrong username/password", http.StatusUnauthorized)
		logInfo("Bad username/password for user: ", username, password, testUsers[password])
		return
	}

	token := uuid.NewString()

	ws.sessionsMutex.Lock()
	ws.loginSessions[username] = Session{token}
	ws.sessionsMutex.Unlock()

	// Send session token to client
	w.Header().Set("Content-Type", "application/json")
	var resp = AuthResponse{token}
	respBytes, err := json.Marshal(resp)
	if err != nil {
		http.Error(w, "Server Error", 500)
	}
	w.Write(respBytes)
}

func (ws *WebServer) handleWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logError("handleWs: upgrader.Upgrade: ", err)
		return
	}
	logDebug("handleWs: new connection: ", r.RemoteAddr)

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
		logError("serviceClient: connection lost")
		close(client.WriteC)
		return
	}

	var inputMsg InputMsg
	err := json.Unmarshal(msgBytes, &inputMsg)
	if err != nil {
		logError("serviceClient: error decoding JSON")
		close(client.WriteC)
		return
	}

	username := inputMsg.Username
	token := inputMsg.Token
	if !ws.loginValid(username, token) {
		logError("serviceClient: no valid login")
		close(client.WriteC)
		return
	}
	client.Username = username

	// client has valid login, pass ownership to game logic
	ws.ClientC <- client
}

/*
	Gorilla WS require all read from same goroutine, so we do it here.
	readC will be closed when the connection ends.
*/
func readPump(conn *websocket.Conn, readC chan []byte) {
	defer func() {
		logDebug("readPump: closing")
		conn.Close()
		close(readC)
	}()

	conn.SetReadLimit(maxMessageSize)

	for {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		conn.SetPongHandler(
			func(string) error {
				conn.SetReadDeadline(time.Now().Add(pongWait))
				return nil
			})
		_, data, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logError("readPump: unexpected websocket error: ", err)
			} else {
				logDebug("readPump: ", err)
			}
			return
		}

		select {
		case readC <- data:
		default:
			logError("readPump: read channel full")
			return
		}
	}
}

/*
	Gorilla WS require all write from same goroutine, so we do it here
*/
func writePump(conn *websocket.Conn, writeC chan []byte) {
	defer func() {
		logDebug("writePump: closing")
		conn.Close()
	}()

	for {
		data, ok := <-writeC
		if !ok { // writeChan closed
			conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		conn.SetWriteDeadline(time.Now().Add(writeWait))
		w, err := conn.NextWriter(websocket.TextMessage)
		if err != nil {
			logError("writePump: NextWriter: ", err)
			return
		}
		w.Write(data)

		if err := w.Close(); err != nil {
			return
		}
	}
}

func (ws *WebServer) loginValid(username, token string) bool {
	ws.sessionsMutex.Lock()
	defer ws.sessionsMutex.Unlock()

	session, ok := ws.loginSessions[username]
	if !ok || token != session.Token {
		return false
	}
	// TODO: should update an expiry timeout
	return true
}
