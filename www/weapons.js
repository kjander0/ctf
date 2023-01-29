import { Vec, Line } from "./math.js";
import * as input from "./input.js"

class Laser {
    static SPEED = 15;

    line = new Line();
    dir = new Vec();

    constructor(pos, dir) {
        this.line.start.set(pos);
        this.line.end.set(pos);
        this.dir.set(dir);
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
    // TODO: share direction of projectile as angle so normalising direction edge case doesn't have to be
    // handled here, on server, and at each client
    world.player.shootPos = null;
    let shootCmd = world.input._commands[input.Input.CMD_SHOOT];
    if (shootCmd.activated) {
        // Set shootPos here to be sent to server
        world.player.shootPos = world.gfx.unproject(shootCmd.mousePos);
        let shootDir = _calcShootDir(world.player.pos, world.player.shootPos);
        world.laserList.push(new Laser(world.player.pos, shootDir));
    }

    // Spawn lasers from other players
    for (let otherPlayer of world.otherPlayers) {
        if (otherPlayer.shootPos === null) {
            continue;
        }
        let shootDir = _calcShootDir(otherPlayer.pos, otherPlayer.shootPos);
        world.laserList.push(new Laser(otherPlayer.pos, shootDir));
        otherPlayer.shootPos = null;
    }
}

function _calcShootDir(playerPos, aimPos) {
    let shootDir =  aimPos.sub(playerPos);
    let shootLen = shootDir.length();
    if (shootLen < 1e-3) {
        shootDir.set(1, 0);
    } else {
        shootDir = shootDir.scale(1/shootLen);
    }
    return shootDir;
}

export {Laser, update};