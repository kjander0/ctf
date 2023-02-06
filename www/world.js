import * as graphics from "./graphics.js";
import * as input from "./input.js";
import * as conf from "./conf.js";

class World {
    clientTick = -1; // 0-255
    serverTick = -1; // from server (0-255)
    deltaMs = 1000.0/60.0;
    accumMs = conf.UPDATE_MS;
    player;
    otherPlayers = [];
    laserList = [];
    input;
    gfx;

    constructor(pixiApp) {
        this.input = new input.Input(pixiApp);
        this.gfx = new graphics.Graphics(pixiApp);
    }
}

export {World};