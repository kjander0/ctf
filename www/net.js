import { Input } from "./input.js";
import { Encoder, Decoder } from "./encode.js";
import { PlayerInputState } from "./player.js";

let socket;
let msgQueue;

async function connect() {
    socket = new WebSocket('ws://localhost:8000/ws');
    socket.binaryType = 'arraybuffer';
    let connectPromise = new Promise(function(resolve, reject) {
        socket.addEventListener('open', function (event) {
            msgQueue = [];
            resolve();
        });
    });

    socket.addEventListener('message', function (event) {
        msgQueue.push(event.data);
    });

    return connectPromise;
}

const inputMsgType = 0;
const stateUpdateMsgType = 1;

const leftBit = 1;
const rightBit = 2;
const upBit = 4;
const downBit = 8;

const throttleFlagBit = 1;

let encoder = new Encoder();

function sendInput(world) {
    let cmdBits = 0;
    let playerInput = new PlayerInputState();
    if (world.input.isActive(Input.CMD_LEFT)) {
        playerInput.left = true;
        cmdBits |= leftBit;
    }
    if (world.input.isActive(Input.CMD_RIGHT)) {
        playerInput.right = true;
        cmdBits |= rightBit;
    }
    if (world.input.isActive(Input.CMD_UP)) {
        playerInput.up = true;
        cmdBits |= upBit;
    }
    if (world.input.isActive(Input.CMD_DOWN)) {
        playerInput.down = true;
        cmdBits |= downBit;
    }
    world.player.unackedInputs.push(playerInput);
    encoder.reset();
    encoder.writeUint8(inputMsgType);
    encoder.writeUint8(cmdBits);
	socket.send(encoder.getView());
}

function consumeMessages(world) {
    for (let msg of msgQueue) {
        let decoder = new Decoder(msg);
        let msgType = decoder.readUint8();
        let flags = decoder.readUint8();
        world.doThrottle = ((flags & throttleFlagBit) == throttleFlagBit);
        switch (msgType) {
            case stateUpdateMsgType:
                _doStateUpdate(world, decoder);
                break;
        }
    }
    msgQueue = [];
}

function _doStateUpdate(world, decoder) {
    world.player.lastAckedPos = decoder.readVec();
    world.player.unackedInputs.shift();

    let numPlayers = decoder.readUint8();
    for (let i = 0; i < numPlayers; i++) {
        let id = decoder.readUint8();
        find player with this id
        set players position/prev_position

    }
}

export {connect, sendInput, consumeMessages};




