import { Vec, Line } from "./math.js";
import * as input from "./input.js"

class Laser {
    static SPEED = 8;

    line = new Line();
    dir = new Vec();

    constructor(pos, angle) {
        this.line.start.set(pos);
        this.line.end.set(pos);
        this.dir = new Vec(Math.cos(angle), Math.sin(angle));
    }
}

function update(world) {
    // Move projectiles before spawning new ones (gives an additional tick for lagg compensation)
    for (let laser of world.laserList) {
        let line = laser.line;
        line.start.set(line.end);
        line.end = line.end.add(laser.dir.scale(Laser.SPEED));
    }

    if (world.player.inputState.doShoot) {
        world.laserList.push(new Laser(world.player.pos, world.player.inputState.aimAngle));
    }
}

export {Laser, update};