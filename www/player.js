import { Vec } from "./math.js";
import { Input } from "./input.js";

class Player {
    static SPEED = 2.5;
    id;
    unackedInputs = [];
    lastAckedPos = new Vec();
    prevPos = new Vec();
    pos = new Vec();
    correctedPos = new Vec();
    didShoot = false;
    shootPos = null;
    graphic;
    lastAckedGraphic;
    correctedGraphic;
}

class PlayerInputState {
    left = false;
    right = false;
    up = false;
    down = false;
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
    if (world.input.isActive(Input.CMD_LEFT)) {
        diff.x -= 1;
    }
    if (world.input.isActive(Input.CMD_RIGHT)) {
        diff.x += 1;
    }
    if (world.input.isActive(Input.CMD_UP)) {
        diff.y += 1;
    }
    if (world.input.isActive(Input.CMD_DOWN)) {
        diff.y -= 1;
    }
    diff = diff.scale(Player.SPEED);
    world.player.correctedPos = world.player.correctedPos.add(diff);
    world.player.prevPos = world.player.pos;
    world.player.pos = world.player.pos.add(diff);

    world.player.pos = world.player.pos.add(world.player.correctedPos).scale(0.5);
    // TODO: correct position with correctedPos above (interpolate overtime?)
}

export {Player, PlayerInputState, update}