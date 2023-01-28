import { Line } from "./math";

class Laser {
    line = new Line();

    constructor(pos) {
        this.line.start.set(pos);
        this.line.end.set(pos);
    }
}

function update(world) {
    let shootCmd = world.input._commands[input.Input.CMD_SHOOT];
    if (!shootCmd.active) {
        return;
    }
    let shootPos = world.gfx.unproject(shootCmd.mousePos);
    world.laserList.push(new Laser(shootPos));
}

export {Laser, update};