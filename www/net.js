import { Encoder, Decoder } from "./encode.js";
import { Player} from "./player.js";
import { SERVER_UPDATE_MS } from "./time.js";
import { Laser } from "./weapons.js";

let socket;

async function connect(world) {
    socket = new WebSocket('ws://localhost:8000/ws');
    socket.binaryType = 'arraybuffer';
    let connectPromise = new Promise(function(resolve, reject) {
        socket.addEventListener('open', function (event) {
            resolve();
        });
    });

    socket.addEventListener('message', function (event) {
        consumeMessage(event.data, world);
    });

    return connectPromise;
}

const inputMsgType = 0;
const stateUpdateMsgType = 1;

const leftBit = 1;
const rightBit = 2;
const upBit = 4;
const downBit = 8;

// Flags from client
const shootFlagBit = 1;

// Flags from server
const throttleFlagBit = 1;
const ackInputFlagBit = 2;

let encoder = new Encoder();

function sendInput(world) {
    // TODO: don't send anything if player isn't doing anything
    let cmdBits = 0;
    let playerInput = world.player.inputState;
    if (playerInput.left) {
        cmdBits |= leftBit;
    }
    if (playerInput.right) {
        cmdBits |= rightBit;
    }
    if (playerInput.up) {
        cmdBits |= upBit;
    }
    if (playerInput.down) {
        cmdBits |= downBit;
    }

    let flags = 0;
    if (playerInput.doShoot) {
        flags |= shootFlagBit;
    }

    encoder.reset();
    encoder.writeUint8(inputMsgType);
    encoder.writeUint8(flags);
    encoder.writeUint8(world.tickCount);
    encoder.writeUint8(cmdBits);
    if (playerInput.doShoot) {
        encoder.writeFloat64(playerInput.aimAngle);
    }

	socket.send(encoder.getView());
}

function consumeMessage(msg, world) {
    let decoder = new Decoder(msg);
    let msgType = decoder.readUint8();
    switch (msgType) {
        case stateUpdateMsgType:
            _doStateUpdate(world, decoder);
            break;
    }
}

function _doStateUpdate(world, decoder) {
    let flags = decoder.readUint8();
    world.doThrottle = ((flags & throttleFlagBit) === throttleFlagBit);

    if ((flags & ackInputFlagBit) === ackInputFlagBit) {
        world.player.unackedInputs.shift();
        console.log("ack: ", world.player.unackedInputs.length);
    }

    world.tickCount = decoder.readUint8();

    world.serverAccumMs -= SERVER_UPDATE_MS;
    world.player.lastAckedPos = decoder.readVec();

    for (let otherPlayer of world.otherPlayers) {
        otherPlayer.disconnected = true;
    }

    let numPlayers = decoder.readUint8();
    for (let i = 0; i < numPlayers; i++) {
        let id = decoder.readUint8();
        let otherPlayer = world.otherPlayers.find(p => id === p.id);
        if (otherPlayer === undefined) {
            otherPlayer = new Player();
            otherPlayer.id = id;
            otherPlayer.graphic = world.gfx.addCircle(0x771177);
            world.otherPlayers.push(otherPlayer);
        }
        otherPlayer.disconnected = false;
        otherPlayer.prevPos = otherPlayer.pos;
        otherPlayer.pos = decoder.readVec();
    }

    let numNewLasers = decoder.readUint16();
    for (let i = 0; i < numNewLasers; i++) {
        let id = decoder.readUint8();
        let player = world.otherPlayers.find(p => id === p.id);
        let laserEnd = decoder.readVec();
        let aimAngle = decoder.readFloat64();
        let newLaser = new Laser(player.pos, aimAngle);
        newLaser.line.end.set(laserEnd);
        world.laserList.push(newLaser);
    }
}

export {connect, sendInput};