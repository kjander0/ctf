import { Encoder, Decoder } from "./encode.js";
import { Player} from "./player.js";
import { Laser } from "./weapons.js";

let socket;

async function connect(world) {
    socket = new WebSocket('ws://' + window.location.host + '/ws');
    socket.binaryType = 'arraybuffer';
    let connectPromise = new Promise(function(resolve, reject) {
        socket.addEventListener('open', function (event) {
            resolve();
        });

        socket.addEventListener('close', function (event) {
            reject();
            console.log("Websocket closed");
        });
    });

    socket.addEventListener('message', function (event) {
        consumeMessage(event.data, world);
    });

    return connectPromise;
}

const inputMsgType = 0;
const stateUpdateMsgType = 1;
const initMsgType = 2;

const leftBit = 1;
const rightBit = 2;
const upBit = 4;
const downBit = 8;

// Flags from client
const shootFlagBit = 1;

// Flags from server
const ackInputFlagBit = 1;

let encoder = new Encoder();

function sendInput(world) {
    // TODO: don't send anything if player isn't doing anything
    // TODO: send last x inputs so server can more easily correct (no need for tick to be sent with inputs)
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
    encoder.writeUint8(playerInput.clientTick);
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
            _processUpdateMsg(world, decoder);
            break;
        case initMsgType:
            _processInitMsg(world, decoder);
            break
    }
}

function _processInitMsg(world, decoder) {
    world.player.id = decoder.readUint8();
    let numRows = decoder.readUint16();
    let rows = [];
    for (let i = 0; i < numRows; i++) {
        let numTiles = decoder.readUint16();
        let arr = decoder.uint8Array(numTiles);
        rows.push(Array.from(arr));
    }
    // TODO: once init received, change player network state and create level elsewhere
    world.gfx.addLevel(rows);
}

function _processUpdateMsg(world, decoder) {
    let flags = decoder.readUint8();

    world.serverTick = decoder.readUint8();

    let ackedTick = -1;
    if ((flags & ackInputFlagBit) === ackInputFlagBit) {
        ackedTick = decoder.readUint8();
    }

    let pos = decoder.readVec(); // NOTE: we arn't using latest value from server if it isn't acking something
    if (ackedTick != -1) {
        world.player.predictedInputs.ack(ackedTick);
        world.player.lastAckedPos = pos;
    }


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
            otherPlayer.lastAckedGraphic = world.gfx.addCircle(0xff0000, false);
            world.otherPlayers.push(otherPlayer);
        }
        otherPlayer.disconnected = false;
        otherPlayer.lastAckedPos = decoder.readVec();
        otherPlayer.lastAckedDirNum = decoder.readUint8();
        otherPlayer.predictedDirs.ack(world.serverTick);
    }

    let numNewLasers = decoder.readUint16();
    for (let i = 0; i < numNewLasers; i++) {
        let id = decoder.readUint8();
        let player = world.otherPlayers.find(p => id === p.id);
        if (player === undefined) {
            player = world.player;
        }
        let laserEnd = decoder.readVec();
        let aimAngle = decoder.readFloat64();
        let newLaser = new Laser(player.lastAckedPos, aimAngle);
        if (player === world.player) {
            newLaser.compensated = true;
        }
        newLaser.line.end.set(laserEnd);
        world.laserList.push(newLaser);
    }

    let numNewHits = decoder.readUint16();
    for (let i = 0; i < numNewHits; i++) {
        world.hits.push(decoder.readVec());
    }
}

export {connect, sendInput, socket};