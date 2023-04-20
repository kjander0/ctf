import * as conf from "./conf.js";
import * as player from "./player.js";
import * as weapons from "./weapons.js";
import * as net from "./net.js";
import {Input} from "./input.js";

class Game {
    doDebug = true;
    doSpeedup = false;
    serverTick = -1; // from server (0-255)
    clientTick = -1; // client tick will be ahead of server (predicted data)
    accumMs = conf.UPDATE_MS;
    deltaMs;
    map = null;
    graphics;
    input;

    player = new player.Player();
    otherPlayers = [];
    laserList = [];
    emitterList = [];

    constructor(graphics, input) {
        this.graphics = graphics;
        this.input = input;
    }

    update(inDeltaMs) {
        if (this.serverTick === -1) {
            return; // wait until we have a world update from server
        }

        if (this.clientTick === -1) {
            this.clientTick = this.serverTick;
        }

        this.deltaMs = inDeltaMs;
        if (this.doSpeedup) {
            this.deltaMs *= 1.05;
        }

        this.accumMs += this.deltaMs;
        if (this.accumMs >= conf.UPDATE_MS) {
            this.accumMs = Math.min(this.accumMs - conf.UPDATE_MS, conf.UPDATE_MS);
            this._update();
            this.clientTick = (this.clientTick + 1) % 256;
        }
        this._render();
    }

    _update() {
        if (this.input.wasActivated(Input.CMD_TOGGLE_DEBUG)) {
            this.doDebug = !this.doDebug;
        }

        if (this.input.wasActivated(Input.CMD_TOGGLE_RECORD)) {
            this.input.toggleRecord();
        }

        for (let i = this.emitterList.length-1; i >= 0; i--) { // loop backwards for removing elements
            if (!this.emitterList[i].update()) {
                this.emitterList.splice(i, 1);
            }
            
        }

        player.sampleInput(this);
        net.sendInput(this);
        // move projectiles before spawning new ones (gives an additional tick for lagg compensation)
        weapons.update(this);
        player.update(this);
        this.removeDisconnectedPlayers();

        this.input.reset(); // do last
    }

    _render() {
        this.graphics.drawGame(this);
    }

    removeDisconnectedPlayers() {
        for (let i = this.otherPlayers.length-1; i >= 0; i--) { // loop backwards for removing elements
            let otherPlayer = this.otherPlayers[i];
            if (!otherPlayer.disconnected) {
                continue;
            }
            this.otherPlayers.splice(i, 1);
        }
    }
}

export { Game };