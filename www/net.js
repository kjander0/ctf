import { Input } from "./input.js";
import { Encoder, Decoder } from "./encode.js";

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

const leftBit = 1;
const rightBit = 2;
const upBit = 4;
const downBit = 8;

const inputMsgType = 0;
const stateUpdateMsgType = 1;

let encoder = new Encoder();

function sendInput(world) {
    let cmdBits = 0;
    if (world.input.isActive(Input.CMD_LEFT)) {
        cmdBits |= leftBit;
    }
    if (world.input.isActive(Input.CMD_RIGHT)) {
        cmdBits |= rightBit;
    }
    if (world.input.isActive(Input.CMD_UP)) {
        cmdBits |= upBit;
    }
    if (world.input.isActive(Input.CMD_DOWN)) {
        cmdBits |= downBit;
    }
    encoder.reset();
    encoder.writeUint8(inputMsgType);
    encoder.writeUint8(cmdBits);
	socket.send(encoder.getView());
}

function consumeMessages(world) {
    for (let msg of msgQueue) {
        let decoder = new Decoder(msg);
        let msgType = decoder.readUint8();
        switch (msgType) {
            case stateUpdateMsgType:
                _doStateUpdate(world, decoder);
                break;
        }
    }
    msgQueue = [];
}

function _doStateUpdate(world, decoder) {
    let numPlayers = decoder.readUint8();

    // Assume first player is me for now
    world.player.lastAckedPos = decoder.readVec();

}

export {connect, sendInput, consumeMessages};




