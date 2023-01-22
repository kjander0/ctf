package main

import (
	"encoding/json"
)

type InputMsg struct {
	InputStates []InputMsgState
}

type InputMsgState struct {
	CommandBits int
}

func ReadMessages(world *World) {
	for i := range world.PlayerList {
	loop:
		for {
			select {
			case msgBytes := <-world.PlayerList[i].Client.ReadC:
				var inputMsg InputMsg
				err := json.Unmarshal(msgBytes, &inputMsg)
				if err != nil {
					LogErrorf("update_net: error decoding JSON: {}", err)
					close(world.PlayerList[i].Client.WriteC)
					break loop
				}

				for _, state := range inputMsg.InputStates {

				}

			default:
				break loop
			}
		}
	}
}
