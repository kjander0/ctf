package web

import (
	"math/rand"
	"time"
)

const (
	delayMs  = 0
	jitterMs = 5000
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
	endC := make(chan bool)
	defer func() {
		close(endC)
		close(dc.OutC)
	}()

	for {
		select {
		case data, ok := <-dc.InC:
			if !ok {
				return
			}

			durationMs := delayMs
			if jitterMs > 0 {
				durationMs += rand.Intn(jitterMs) - jitterMs/2
			}
			if durationMs < 0 {
				durationMs = 0
			}
			duration := time.Duration(durationMs) * time.Millisecond

			time.AfterFunc(duration, func() {
				select {
				case <-endC:
				case triggerC <- true:
				}
			})
			dc.queue = append(dc.queue, data)
		case <-triggerC:
			dc.OutC <- dc.queue[0]
			dc.queue = dc.queue[1:]
		}
	}
}
