import { Vec } from "./math.js";
import { Input } from "./input.js";

class Player {
    static SPEED = 150.0;

    unackedInputs = [];
    lastAckedPos = new Vec();
    pos = new Vec();
    graphic;
}

function update(world) {
    // TODO: might want to delay prediction by a tick so player sees closer to server reality
    let dir = new Vec();
    if (world.input.isActive(Input.CMD_LEFT)) {
        dir.x -= 1;
    }
    if (world.input.isActive(Input.CMD_RIGHT)) {
        dir.x += 1;
    }
    if (world.input.isActive(Input.CMD_UP)) {
        dir.y += 1;
    }
    if (world.input.isActive(Input.CMD_DOWN)) {
        dir.y -= 1;
    }

    world.player.pos = world.player.pos.add(dir.scale(Player.SPEED * world.updateSecs));
    world.player.pos = world.player.lastAckedPos;
}

export {Player, update}