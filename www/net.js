import { Input } from "./input.js";

let socket;
let msgQueue;

async function connect() {
    socket = new WebSocket('ws://localhost:8000/ws');
    socket.binaryType = 'arraybuffer';
    let connectPromise = new Promise(function(resolve, reject) {
        socket.addEventListener('open', function (event) {
            console.log("websocket opened");
            msgQueue = [];
            resolve();
            socket.send(JSON.stringify({Username: "user"}));
        });
    });

    socket.addEventListener('message', function (event) {
        if (event.data instanceof ArrayBuffer) {
            msgQueue.push(event.data);
        } else {
            msgQueue.push(JSON.parse(event.data));
        }
    });

    return connectPromise;
}

const leftBit = 1;
const rightBit = 1;
const upBit = 1;
const downBit = 1;

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
	socket.send(JSON.stringify({cmdBits: cmdBits}));
}

function rcvMsg() {
    return msgQueue.shift();
}

export {connect, sendInput, rcvMsg};




