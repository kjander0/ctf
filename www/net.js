import { Encoder, Decoder } from "./encode.js";
import { Player} from "./player.js";
import { Laser } from "./weapons.js";
import { Map } from "./map/map.js";
import * as sound from "./sound.js";
import * as particle from "./gfx/particle.js";

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
const shootBit = 16;
const secondaryBit = 32;
const dropFlagBit = 64;

// Flags from server
const ackInputFlagBit = 1;
const speedupFlagBit = 2;

let encoder = new Encoder();

function sendInput(game) {
    // TODO: don't send anything if player isn't doing anything
    // TODO: send last x inputs so server can more easily correct (no need for tick to be sent with inputs)
    let cmdBits = 0;
    let playerInput = game.player.inputState;
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
    if (playerInput.doShoot) {
        cmdBits |= shootBit;
    }
    if (playerInput.doSecondary) {
        cmdBits |= secondaryBit;
    }
    if (playerInput.dropFlag) {
        cmdBits |= dropFlagBit;
    }

    encoder.reset();
    encoder.writeUint8(inputMsgType);
    encoder.writeUint8(playerInput.tick); // tick that this input should be applied
    encoder.writeUint8(cmdBits);
    if (playerInput.doShoot || playerInput.doSecondary) {
        encoder.writeFloat64(playerInput.aimAngle);
    }
	socket.send(encoder.getView());
}

function consumeMessage(msg, game) {
    // If app is backgrounded by browser it will stop receiving animation callbacks, but it will still receive
    // network callbacks. We can ignore game state update messages from the server and reset the client net state
    // once the app is active again.
    if (game.isBackgrounded()) {
        game.doNetReset = true;
    }

    let decoder = new Decoder(msg);
    let msgType = decoder.readUint8();
    switch (msgType) {
        case stateUpdateMsgType:
            if (!game.doNetReset) {
                _processUpdateMsg(game, decoder);
            }
            break;
        case initMsgType:
            _processInitMsg(game, decoder);
            break
    }
}

function _processInitMsg(game, decoder) {
    game.player.id = decoder.readUint8();
}

function _processUpdateMsg(game, decoder) {
    let flags = decoder.readUint8();
    
    game.doSpeedup = false;
    if ((flags & speedupFlagBit) === speedupFlagBit) {
        game.doSpeedup = true;
    }

    game.serverTick = decoder.readUint8();

    let ackedTick = -1;
    if ((flags & ackInputFlagBit) === ackInputFlagBit) {
        ackedTick = decoder.readUint8();
    }

    let newState = decoder.readUint8();
    if (game.player.state !== newState) {
        game.player.stateChanged = true;
    }
    game.player.state = newState;

    game.player.flagIndex = decoder.readInt8();

    // TODO: setting lastAckedPos without ackedTick could cause stuttered movement
    // but we want to make sure pos is available for first load into game
    const ackPos = decoder.readVec();
    const ackEnergy = decoder.readUint16();
    const ackBouncyEnergy = decoder.readUint16();
    if (ackedTick !== -1) {
        game.player.predictedInputs.ack(ackedTick);
        game.player.acked.pos = ackPos;
        game.player.acked.energy = ackEnergy;
        game.player.acked.bouncyEnergy = ackBouncyEnergy;
    }

    // Even if server is not acking a tick, if state changed we want the latest position
    if (game.player.stateChanged) {
        game.player.acked.pos = ackPos;
        game.player.acked.energy = ackEnergy;
        game.player.acked.bouncyEnergy = ackBouncyEnergy;
    }

    for (let otherPlayer of game.otherPlayers) {
        otherPlayer.disconnected = true;
    }

    let numPlayers = decoder.readUint8();
    for (let i = 0; i < numPlayers; i++) {
        let id = decoder.readUint8();
        let otherPlayer = game.otherPlayers.find(p => id === p.id);
        if (otherPlayer === undefined) {
            otherPlayer = new Player();
            otherPlayer.id = id;
            game.otherPlayers.push(otherPlayer);
        }
        otherPlayer.disconnected = false;
        let newState = decoder.readUint8();
        if (otherPlayer.state.state !== newState) {
            otherPlayer.stateChanged = true;
        }
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
        let player = game.otherPlayers.find(p => id === p.id);
        if (player === undefined) {
            player = game.player;
        } else {
            if (type === Laser.TYPE_LASER) {
                gotOtherLaser = true;
            } else if (type === Laser.TYPE_BOUNCY) {
                gotOtherBouncy = true;
            }
        }
        let laserStart = decoder.readVec();
        let laserEnd = decoder.readVec();
        let aimAngle = decoder.readFloat64();
        let newLaser = new Laser(type, id, player.acked.pos, aimAngle, game.serverTick);
        newLaser.line.start.set(laserStart);
        newLaser.line.end.set(laserEnd);
        game.laserList.push(newLaser);
    }

    if (gotOtherLaser) {
        sound.playLaser();
    }
    if (gotOtherBouncy) {
        sound.playBouncy();
    }

    let numNewHits = decoder.readUint16();
    for (let i = 0; i < numNewHits; i++) {
        let hitPos = decoder.readVec();
        const emitter = new particle.Emitter(hitPos, particle.sparkEmitterParams);
        game.emitterList.push(emitter);
    }
    if (numNewHits > 0) {
        sound.playHit();
    }

    let numFlags = decoder.readUint8();
    if (game.flagList.length !== numFlags) {
        game.flagList = new Array(numFlags);
    }
    for (let i = 0; i < numFlags; i++) {
        game.flagList[i] = decoder.readVec();
    }
}

export {connect, sendInput, socket};