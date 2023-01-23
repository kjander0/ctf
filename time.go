package main

import (
	"log"
	"time"
)

// Fixed timestep ticker
type Ticker struct {
	FrameTimeSecs float64
	frameTime     time.Duration
	accum         time.Duration
	prevTime      time.Time
	started       bool
}

func NewTicker(tickRate float64) *Ticker {
	frameTimeSecs := 1.0 / tickRate
	return &Ticker{
		FrameTimeSecs: frameTimeSecs,
		frameTime:     time.Duration(frameTimeSecs * float64(time.Second)),
	}
}

func (t *Ticker) Start() {
	t.started = true
	t.prevTime = time.Now()
}

func (t *Ticker) Sleep() {
	if !t.started {
		log.Panic("ticker was not started")
	}
	spentTime := time.Since(t.prevTime)
	sleepDuration := t.frameTime + t.accum - spentTime
	time.Sleep(sleepDuration) // negative duration is ok
	spentTime = time.Since(t.prevTime)
	t.accum += t.frameTime - spentTime
	t.prevTime = time.Now()
}
