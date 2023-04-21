import * as conf from "./conf.js";
import * as player from "./player.js";
import * as weapons from "./weapons.js";
import * as net from "./net.js";
import {Input} from "./input.js";

const BACKGROUNDED_MS = 1000;

class Game {
    doDebug = true;
    doSpeedup = false;
    doNetReset = false;
    serverTick = -1; // from server (0-255)
    accumMs = conf.UPDATE_MS;
    deltaMs;
    updateTimestampMs = performance.now();
    
    map = null;
    graphics;
    input;

    player = new player.Player();
    otherPlayers = [];
    laserList = [];
    emitterList = [];
    flagList = [];

    constructor(graphics, input) {
        this.graphics = graphics;
        this.input = input;
    }

    isBackgrounded() {
        if (performance.now() - this.updateTimestampMs > BACKGROUNDED_MS) {
            console.log("game backgrounded");
            return true;
        }
        return false;
    }

    update(inDeltaMs) {
        this.updateTimestampMs = performance.now();

        if (this.serverTick === -1) {
            return; // wait until we have a world update from server
        }

        this.deltaMs = inDeltaMs;
        if (this.doSpeedup) {
            this.deltaMs *= 1.02;
        }

        this.accumMs += this.deltaMs;
        if (this.accumMs >= conf.UPDATE_MS) {
            this.accumMs = Math.min(this.accumMs - conf.UPDATE_MS, conf.UPDATE_MS);
            this._update();
        }
        this._render();
    }

    _update() {
        if (this.doNetReset) {
            this._resetNetState();
            this.doNetReset = false;
        }

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
        this._removeDisconnectedPlayers();

        this.input.reset(); // do last
    }

    _render() {
        this.graphics.drawGame(this);
    }

    _removeDisconnectedPlayers() {
        for (let i = this.otherPlayers.length-1; i >= 0; i--) { // loop backwards for removing elements
            let otherPlayer = this.otherPlayers[i];
            if (!otherPlayer.disconnected) {
                continue;
            }
            this.otherPlayers.splice(i, 1);
        }
    }

    _resetNetState() {
        console.log("resetting net state");   
        this.player.predictedInputs.clear();
    
        for (let otherPlayer of this.otherPlayers) {
            otherPlayer.predictedDirs.clear();
        }
    }


}

export { Game };