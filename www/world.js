import * as input from "./input.js";
import * as conf from "./conf.js";

class World {
    clientTick = -1; // 0-255
    serverTick = -1; // from server (0-255)
    deltaMs = 1000.0/60.0;
    accumMs = conf.UPDATE_MS;
    map = null;
    player;
    otherPlayers = [];
    laserList = [];
    graphics;
    input;

    constructor(graphics, input) {
        this.graphics = graphics;
        this.input = input;
    }
}

export {World};