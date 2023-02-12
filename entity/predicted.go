package entity

import "github.com/kjander0/ctf/logger"

type PredictedInputs struct {
	Predicted     []InputPrediction
	Acked         []PlayerInput
	LastAckedTick uint8
	capacity      int
	advanced      bool
}

type InputPrediction struct {
	input PlayerInput
	tick  uint8
}

func NewPredictedInputs(capacity int) PredictedInputs {
	return PredictedInputs{
		capacity: capacity,
	}
}

func (p *PredictedInputs) Predict(input PlayerInput, tick uint8) {
	prediction := InputPrediction{input, tick}
	if len(p.Predicted) == p.capacity {
		// Shift predictions (dropping oldest)
		logger.Debug("dropping a prediction")
		p.Predicted = p.Predicted[1:]
	}
	p.Predicted = append(p.Predicted, prediction)
}

func (p *PredictedInputs) Ack(input PlayerInput, tick uint8) {
	p.LastAckedTick = tick

	if p.advanced { // we don't want to advance inputs more than once per tick
		logger.Debug("overriding input")
		p.Acked[len(p.Acked)-1] = input
		return
	}

	p.Acked = append(p.Acked, input)

	if len(p.Predicted) == 0 {
		p.advanced = true
		return
	}

	p.Predicted = p.Predicted[1:]
}

func (p *PredictedInputs) ClearAcked() {
	p.Acked = p.Acked[:0]
	p.advanced = false
}
