import { Encoder, Decoder } from "./encode.js";
import { Player} from "./player.js";
import { Laser } from "./weapons.js";
import { Map } from "./map.js";
import * as sound from "./sound.js";

let socket;

async function connect(game) {
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
        consumeMessage(event.data, game);
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
const secondaryFlagBit = 2;

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
    if (playerInput.doSecondary) {
        flags |= secondaryFlagBit;
    }

    encoder.reset();
    encoder.writeUint8(inputMsgType);
    encoder.writeUint8(flags);
    encoder.writeUint8(playerInput.clientTick);
    encoder.writeUint8(cmdBits);
    if (playerInput.doShoot || playerInput.doSecondary) {
        encoder.writeFloat64(playerInput.aimAngle);
    }
	socket.send(encoder.getView());
}

function consumeMessage(msg, game) {
    let decoder = new Decoder(msg);
    let msgType = decoder.readUint8();
    switch (msgType) {
        case stateUpdateMsgType:
            _processUpdateMsg(game, decoder);
            break;
        case initMsgType:
            _processInitMsg(game, decoder);
            break
    }
}

function _processInitMsg(game, decoder) {
    const world = game.world;
    world.player.id = decoder.readUint8();
    let numRows = decoder.readUint16();
    let rows = [];
    for (let i = 0; i < numRows; i++) {
        let numTiles = decoder.readUint16();
        let arr = decoder.uint8Array(numTiles);
        rows.push(Array.from(arr));
    }
    game.map = new Map(rows);
}

function _processUpdateMsg(game, decoder) {
    const world = game.world;

    let flags = decoder.readUint8();

    game.serverTick = decoder.readUint8();

    let ackedTick = -1;
    if ((flags & ackInputFlagBit) === ackInputFlagBit) {
        ackedTick = decoder.readUint8();
    }

    let newState = decoder.readUint8();
    if (world.player.state !== newState) {
        world.player.stateChanged = true;
    }
    world.player.state = newState;

    // TODO: setting lastAckedPos without ackedTick could cause stuttered movement
    // but we want to make sure pos is available for first load into game
    const ackPos = decoder.readVec();
    const ackEnergy = decoder.readUint8();

    if (ackedTick != -1) {
        world.player.predictedInputs.ack(ackedTick);
        world.player.acked.pos = ackPos;
        world.player.acked.energy = ackEnergy;
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
            world.otherPlayers.push(otherPlayer);
        }
        otherPlayer.disconnected = false;
        let newState = decoder.readUint8();
        otherPlayer.stateChanged = otherPlayer.state !== newState;
        otherPlayer.state = newState;
        otherPlayer.acked.pos = decoder.readVec();
        otherPlayer.lastAckedDirNum = decoder.readUint8();
        otherPlayer.predictedDirs.ack(game.serverTick);
    }

    let numNewLasers = decoder.readUint16();
    let gotOtherLaser = false;
    let gotOtherBouncy = false;
    for (let i = 0; i < numNewLasers; i++) {
        let type = decoder.readUint8();
        let id = decoder.readUint8();
        let player = world.otherPlayers.find(p => id === p.id);
        if (player === undefined) {
            player = world.player;
        } else {
            if (type === Laser.TYPE_LASER) {
                gotOtherLaser = true;
            } else if (type === Laser.TYPE_BOUNCY) {
                gotOtherBouncy = true;
            }
        }
        let laserEnd = decoder.readVec();
        let aimAngle = decoder.readFloat64();
        let newLaser = new Laser(type, id, player.lastAckedPos, aimAngle);
        if (player === world.player) {
            newLaser.compensated = true;
        }
        newLaser.line.end.set(laserEnd);
        world.laserList.push(newLaser);
    }

    if (gotOtherLaser) {
        sound.laser.play();
    }
    if (gotOtherBouncy) {
        sound.bouncy.play();
    }

    let numNewHits = decoder.readUint16();
    for (let i = 0; i < numNewHits; i++) {
        let hitPos = decoder.readVec();
        // TODO: handle hits
    }
    if (numNewHits > 0) {
        sound.hit.play();
    }
}

export {connect, sendInput, socket};