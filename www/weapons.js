import { Vec, Line } from "./math.js";
import * as conf from "./conf.js";

class Laser {
    line = new Line();
    dir = new Vec();

    constructor(pos, angle) {
        this.line.start.set(pos);
        this.line.end.set(pos);
        this.dir = new Vec(Math.cos(angle), Math.sin(angle));
    }
}

function update(world) {
    // TODO: lagg compensate new lasers from other players based on how far ahead
    // my client side prediction is
    // - Note: it would be nice to have some top level controls for shooter/target lagg compensation for tuning
    for (let laser of world.laserList) {
        let line = laser.line;
        line.start.set(line.end);
        line.end = line.end.add(laser.dir.scale(conf.LASER_SPEED));
    }

    if (world.player.inputState.doShoot) {
        world.laserList.push(new Laser(world.player.pos, world.player.inputState.aimAngle));
    }
}

export {Laser, update};