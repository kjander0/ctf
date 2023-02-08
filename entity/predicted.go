package entity

import "github.com/kjander0/ctf/logger"

type PredictedInputs struct {
	Predicted    []InputPrediction
	Acked        []PlayerInput
	capacity     int
	ackMax       int
	lastTick     uint8
	gotFirstTick bool
}

type InputPrediction struct {
	input PlayerInput
	tick  uint8
}

func NewPredictedInputs(capacity int) PredictedInputs {
	return PredictedInputs{
		make([]InputPrediction, 0, capacity),
		make([]PlayerInput, 0, capacity),
		capacity,
		1,
		0,
		false,
	}
}

func (p *PredictedInputs) Predict(input PlayerInput) {
	if len(p.Predicted) == p.capacity {
		logger.Debug("dropping a prediction")
		return
	}
	p.lastTick += 1
	p.Predicted = append(p.Predicted, InputPrediction{input, p.lastTick})
}

func (p *PredictedInputs) Ack(input PlayerInput, tick uint8) {
	if !p.gotFirstTick {
		p.lastTick = tick
	}
	p.Acked = append(p.Acked, input)

	if len(p.Acked) == p.ackMax {
		p.Acked[len(p.Acked)-1] = input
	}

	if len(p.Predicted) == 0 {
		return
	}

	index := -1
	for i := range p.Predicted {
		if p.Predicted[i].tick == tick {
			index = i
		}
	}

	if index == -1 {
		index = 0 // couldn't find predicted input for this tick, so just ack the oldest
	}
	p.Predicted[index] = p.Predicted[len(p.Predicted)-1]
	p.Predicted = p.Predicted[:len(p.Predicted)-1]
}

func (p *PredictedInputs) ClearAcked() {
	p.Acked = p.Acked[:0]
	p.ackMax = len(p.Predicted) + 1 // Musn't ack more than once in a tick once all predictions have been acked
}
