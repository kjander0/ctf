import { Vec } from "./math.js"
import { Input } from "./input.js"
import {Predicted} from "./predicted.js"
import * as conf from "./conf.js"
import * as sound from "./sound.js"
import * as gfx from "./gfx/gfx.js"

class Player {
    static SPEED = 2.5;
    static MAX_INPUT_PREDICTIONS = 60;
    static MAX_DIR_PREDICTIONS = 5;

    id;
    inputState = null;
    predictedInputs = new Predicted(Player.MAX_INPUT_PREDICTIONS);
    predictedDirs = new Predicted(Player.MAX_DIR_PREDICTIONS);
    lastAckedPos = new Vec();
    // direction numbers
    // 4 3 2
    // 5 0 1
    // 6 7 8
    lastAckedDirNum = 0; // used for extrapolating movement of other players
    prevPos = new Vec();
    pos = new Vec();
    correctedPos = new Vec();
    energy = conf.PLAYER_ENERGY;
}

class PlayerInputState {
    clientTick = 0;
    left = false;
    right = false;
    up = false;
    down = false;
    doShoot = false;
    doSecondary = false;
    aimAngle = 0;
}

function sampleInput(world) {
    let inputState = new PlayerInputState();
    inputState.clientTick = world.clientTick;
    if (world.input.isActive(Input.CMD_LEFT)) {
        inputState.left = true;
    }
    if (world.input.isActive(Input.CMD_RIGHT)) {
        inputState.right = true;
    }
    if (world.input.isActive(Input.CMD_UP)) {
        inputState.up = true;
    }
    if (world.input.isActive(Input.CMD_DOWN)) {
        inputState.down = true;
    }
    let shootCmd = world.input.getCommand(Input.CMD_SHOOT);
    if (shootCmd.wasActivated) {
        if (world.player.energy >= conf.LASER_ENERGY_COST) {
            sound.laser.play();
            inputState.doShoot = true;
            let aimPos = gfx.unproject(shootCmd.mousePos);
            inputState.aimAngle = _calcAimAngle(world.player.pos, aimPos);
        }
    }

    let secondaryCmd = world.input.getCommand(Input.CMD_SECONDARY);
    if (secondaryCmd.wasActivated) {
        sound.bouncy.play();
        inputState.doSecondary = true;
        let aimPos = gfx.unproject(secondaryCmd.mousePos);
        inputState.aimAngle = _calcAimAngle(world.player.pos, aimPos);
    }

    world.player.inputState = inputState;
    world.player.predictedInputs.predict(inputState, world.clientTick);
}

function update(world) {
    for (let other of world.otherPlayers) {
        _moveOtherPlayer(other, world);
    }

    world.player.correctedPos = new Vec(world.player.lastAckedPos);
    // TODO: make dirFromInput function so we don't have these 4 if confitions repeated twice
    for (let unacked of world.player.predictedInputs.unacked) {
        let inputState = unacked.val;
        let disp = _calcDisplacement(inputState);
        world.player.correctedPos = world.player.correctedPos.add(disp);
    }

    // TODO: might want to delay prediction by a tick so player sees closer to server reality
    let disp = _calcDisplacement(world.player.inputState);
    world.player.prevPos = world.player.pos;
    world.player.pos = world.player.pos.add(disp);
    
    let correction = world.player.correctedPos.sub(world.player.pos);
    let corrLen = correction.length();
    if (corrLen > conf.PLAYER_SPEED) {
        correction = correction.scale(conf.PLAYER_SPEED / corrLen);
    }
    world.player.pos = world.player.pos.add(correction);
}

function _moveOtherPlayer(player, world) {
    player.prevPos = player.pos;
    player.pos = player.lastAckedPos;
    for (let predicted of player.predictedDirs.unacked) {
        let disp = _dirFromNum(predicted.val).scale(conf.PLAYER_SPEED);
        player.pos = player.pos.add(disp);
    }

    // Predict movement for next tick
    let lastTick = player.predictedDirs.lastTickOrNull();
    if (lastTick === null) {
        lastTick = world.serverTick;
    }
    player.predictedDirs.predict(player.lastAckedDirNum, lastTick+1);
}

function _calcAimAngle(startPos, aimPos) {
    let dir = aimPos.sub(startPos);
    if (dir.length() < 1e-3) {
        return 0;
    }
    return Math.atan2(dir.y, dir.x);
}

function _calcDisplacement(input) {
    let dir = new Vec();
    if (input.left) {
        dir.x -= 1;
    }
    if (input.right) {
        dir.x += 1;
    }
    if (input.up) {
        dir.y += 1;
    }
    if (input.down) {
        dir.y -= 1;
    }
    let len = dir.length();
    if (len < 1e-6) {
        return dir;
    }
    return dir.scale(conf.PLAYER_SPEED/len);
}

// direction numbers
// 4 3 2
// 5 0 1
// 6 7 8
function _dirFromNum(num) {
    if (num == 1) {
        return new Vec(1, 0);
    }
    if (num == 2) {
        return new Vec(1, 1);
    }
    if (num == 3) {
        return new Vec(0, 1);
    }
    if (num == 4) {
        return new Vec(-1, 1);
    }
    if (num == 5) {
        return new Vec(-1, 0);
    }
    if (num == 6) {
        return new Vec(-1, -1);
    }
    if (num == 7) {
        return new Vec(0, -1);
    }
    if (num == 8) {
        return new Vec(1, -1);
    }
    return new Vec(0, 0);
}

export {Player, PlayerInputState, sampleInput, update}