package web

import (
	"math/rand"
	"time"
)

const (
	delayMs  = 500
	jitterMs = 1
)

// Channel for adding artificial delay/jitter to data
type DelayChannel struct {
	InC   chan []byte
	OutC  chan []byte
	queue [][]byte
}

func NewDelayChannel() DelayChannel {
	return DelayChannel{
		InC:  make(chan []byte, 128),
		OutC: make(chan []byte, 128),
	}
}

func (dc *DelayChannel) Start() {
	triggerC := make(chan bool)
	defer func() {
		close(dc.OutC)
	}()

	for {
		select {
		case data, ok := <-dc.InC:
			if !ok {
				return
			}
			delay := time.Duration(delayMs+rand.Int31n(jitterMs)) * time.Millisecond
			// TODO: these functions won't end if InC closes (player disconnects)
			time.AfterFunc(delay, func() {
				triggerC <- true
			})
			dc.queue = append(dc.queue, data)
		case <-triggerC:
			dc.OutC <- dc.queue[0]
			dc.queue = dc.queue[1:]
		}
	}
}
