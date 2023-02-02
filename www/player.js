import { Vec } from "./math.js";
import { Input } from "./input.js";

class Player {
    static SPEED = 2.5;

    id;
    inputState = null;
    unackedInputs = [];
    lastAckedPos = new Vec();
    prevPos = new Vec();
    pos = new Vec();
    correctedPos = new Vec();
    graphic;
    lastAckedGraphic;
    correctedGraphic;
}

class PlayerInputState {
    tick = 0;
    left = false;
    right = false;
    up = false;
    down = false;
    doShoot = false;
    aimAngle = 0;
}

function sampleInput(world) {
    let inputState = new PlayerInputState();
    inputState.tick = world.clientTick;
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
    
    // TODO correct position
    //world.player.pos = world.player.pos.add(world.player.correctedPos).scale(0.5);
}

function _calcAimAngle(startPos, aimPos) {
    let dir = aimPos.sub(startPos);
    if (dir.length() < 1e-3) {
        return 0;
    }
    return Math.atan2(dir.y, dir.x);
}

export {Player, PlayerInputState, sampleInput, update}