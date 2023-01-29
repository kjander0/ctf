import { Vec, Line } from "./math.js";
import * as input from "./input.js"

class Laser {
    static SPEED = 10;

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
    moveLasers(world);
    shootWeapons(world);
}

function moveLasers(world) {
    for (let laser of world.laserList) {
        let line = laser.line;
        line.start.set(line.end);
        line.end = line.end.add(laser.dir.scale(Laser.SPEED));
    }
}

function shootWeapons(world) {
    world.player.didShoot = false
    let shootCmd = world.input._commands[input.Input.CMD_SHOOT];
    if (shootCmd.activated) {
        world.player.didShoot = true;
        let aimPos = world.gfx.unproject(shootCmd.mousePos);
        world.player.aimAngle = _calcAimAngle(world.player.pos, aimPos);
        world.laserList.push(new Laser(world.player.pos, world.player.aimAngle));
    }
}

function _calcAimAngle(startPos, aimPos) {
    let dir = aimPos.sub(startPos);
    if (dir.length() < 1e-3) {
        return 0;
    }
    return Math.atan2(dir.y, dir.x);
}

export {Laser, update};