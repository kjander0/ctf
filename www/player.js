import { Vec } from "./math.js";
import { Input } from "./input.js";

class Player {
    static SPEED = 2.5;

    id;
    inputState = null;
    posPredictions = new PredictionHistory(new Vec());
    unackedInputs = [];
    lastAckedPos = new Vec();
    // direction numbers
    // 4 3 2
    // 5 0 1
    // 6 7 8
    lastAckedDirNum = 0; // used for extrapolating movement of other players
    prevPos = new Vec();
    pos = new Vec();
    predictedPos = new Vec();
    correctedPos = new Vec();
    graphic;
    lastAckedGraphic;
    correctedGraphic;
}

class PlayerInputState {
    clientTick = 0;
    left = false;
    right = false;
    up = false;
    down = false;
    doShoot = false;
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
        inputState.doShoot = true;
        let aimPos = world.gfx.unproject(shootCmd.mousePos);
        inputState.aimAngle = _calcAimAngle(world.player.pos, aimPos);
    }
    world.player.inputState = inputState;
    world.player.unackedInputs.push(inputState);
}

function update(world) {
    for (let other of world.otherPlayers) {
        _moveOtherPlayer(other);
    }

    let correctedPos = new Vec(world.player.lastAckedPos);
    for (let inputState of world.player.unackedInputs) {
        let dir = new Vec();
        if (inputState.left) {
            dir.x -= 1;
        }
        if (inputState.right) {
            dir.x += 1;
        }
        if (inputState.up) {
            dir.y += 1;
        }
        if (inputState.down) {
            dir.y -= 1;
        }
        correctedPos = correctedPos.add(dir.scale(Player.SPEED));
    }

    // TODO: might want to delay prediction by a tick so player sees closer to server reality
    let diff = new Vec();
    if (world.player.inputState.left) {
        diff.x -= 1;
    }
    if (world.player.inputState.right) {
        diff.x += 1;
    }
    if (world.player.inputState.up) {
        diff.y += 1;
    }
    if (world.player.inputState.down) {
        diff.y -= 1;
    }
    diff = diff.scale(Player.SPEED);
    world.player.correctedPos = correctedPos.add(diff);

    world.player.prevPos = world.player.pos;
    world.player.pos = world.player.pos.add(diff);
    
    let correction = world.player.correctedPos.sub(world.player.pos);
    let corrLen = correction.length();
    if (corrLen > Player.SPEED) {
        correction = correction.scale(Player.SPEED / corrLen);
    }
    world.player.pos = world.player.pos.add(correction);
}

function _moveOtherPlayer(player) {
    // TODO: predict and correct other player movement
    player.prevPos = player.pos;
    let disp = player.lastAckedPos.sub(player.pos);
    let dispLen = disp.length();

    // TODO: limit how many ticks we predict
    if (dispLen < 1e-3 && player.lastAckedDirNum != 0) {
        player.predictedPos = player.pos.add(_dirFromNum(player.lastAckedDirNum).scale(Player.SPEED));
    }

    let moveLen = dispLen;
    if (moveLen > Player.SPEED) {
        moveLen = Math.floor(moveLen / Player.SPEED) * Player.SPEED;
    } // TODO else limit to player.Speed!!!

    if (dispLen > 0) {
        disp = disp.scale(moveLen / dispLen);
    }
    player.pos = player.pos.add(disp);
    player.predictedPos.set(player.pos);
}

function _calcAimAngle(startPos, aimPos) {
    let dir = aimPos.sub(startPos);
    if (dir.length() < 1e-3) {
        return 0;
    }
    return Math.atan2(dir.y, dir.x);
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
        return new Vec(-1, -1);
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