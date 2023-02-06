import { Vec, Line } from "./math.js";
import * as conf from "./conf.js";

class Laser {
    line = new Line();
    dir = new Vec();
    compensated = false;

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
        // TODO: make sure shooter and others move laser for the first time on the same server tick
        let numberSteps = 1;
        if (!laser.compensated) {
            laser.compensated = true;
            let tickDiff = world.player.predictedInputs.unacked.length;
            if (tickDiff < 0) { // client tick wrapped and server tick has not
                tickDiff += 256;
            }
            console.log("tickdiff: ", tickDiff);
            numberSteps += tickDiff;
        }

        let line = laser.line;
        line.start.set(line.end);
        line.end = line.end.add(laser.dir.scale(numberSteps * conf.LASER_SPEED));
    }
}

export {Laser, update};