import * as graphics from "./graphics.js";
import * as input from "./input.js";

class World {
    clientTick = -1; // 0-255
    serverTick = -1; // from server (0-255)
    deltaMs = 1000.0/60.0;
    accumMs = 0;
    serverAccumMs = 0; // time accumulation for server updates from server
    doThrottle = false;
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