package web

import (
	"math/rand"
	"sync"
	"time"
)

const (
	delayMs  = 0
	jitterMs = 0
	lossRate = 0
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

	var mutex sync.Mutex
	for {
		select {
		case data, ok := <-dc.InC:
			if !ok {
				return
			}

			durationMs := delayMs
			if jitterMs > 0 {
				durationMs += 2*rand.Intn(jitterMs) - jitterMs
				if durationMs < 0 {
					durationMs = 0
				}
			}

			if lossRate > 0 {
				if rand.Float64() <= lossRate {
					durationMs += 2 * delayMs
				}
			}

			duration := time.Duration(durationMs) * time.Millisecond

			go func() {
				timer := time.NewTimer(duration)

				defer mutex.Unlock()
				mutex.Lock()

				<-timer.C

				select {
				case <-endC:
				case triggerC <- true:
				}
			}()

			dc.queue = append(dc.queue, data)
		case <-triggerC:
			dc.OutC <- dc.queue[0]
			dc.queue = dc.queue[1:]
		}
	}
}
