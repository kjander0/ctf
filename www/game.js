import * as conf from "./conf.js";
import * as player from "./player.js";
import * as weapons from "./weapons.js";
import * as net from "./net.js";
import {Vec} from "./math.js";
import {Input} from "./input.js";
import {Emitter, EmitterParams} from "./gfx/particle.js";

class Game {
    doDebug = true;
    clientTick = -1; // 0-255
    serverTick = -1; // from server (0-255)
    accumMs = conf.UPDATE_MS;
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

    update(deltaMs) {
        if (this.serverTick === -1) {
            return; // wait until we have a world update from server
        }

        if (this.clientTick === -1) {
            this.clientTick = this.serverTick;
        }

        this.accumMs += deltaMs;
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