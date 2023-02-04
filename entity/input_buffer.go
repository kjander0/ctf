package entity

import "github.com/kjander0/ctf/logger"

// Circular buffer of player inputs
type InputBuffer struct {
	start  int
	end    int
	inputs []PlayerInput
}

func NewInputBuffer(size int) InputBuffer {
	return InputBuffer{
		0,
		0,
		make([]PlayerInput, size),
	}
}

// Push input into buffer, acking any predicted inputs, return number of inputs
func (ib *InputBuffer) Push(state PlayerInput) int {
	ib.inputs[ib.end] = state

	if ib.end == ib.start { // buffer full
		ib.start = ib.increment(ib.start)
		logger.Debug("INPUT BUFFER FULL, dropping an input")
	}

	ib.end = ib.increment(ib.end)

	return ib.size()
}

func (ib *InputBuffer) Pop() (bool, PlayerInput) {
	input := ib.inputs[ib.start]
	if ib.start == ib.end {
		return false, input
	}
	ib.start = ib.increment(ib.start)

	return true, input
}

func (ib *InputBuffer) increment(index int) int {
	return (index + 1) % len(ib.inputs)
}

func (ib *InputBuffer) size() int {
	count := ib.end - ib.start
	if count < 0 {
		count += len(ib.inputs)
	}
	return count
}
