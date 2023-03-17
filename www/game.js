import * as conf from "./conf.js";
import * as player from "./player.js";
import * as weapons from "./weapons.js";
import * as net from "./net.js";
import {WorldState, WorldHistory} from "./world.js";

class Game {
    static MAX_WORLD_HISTORY = 60;
    static MAX_DIR_PREDICTIONS = 5;

    clientTick = -1; // 0-255
    serverTick = -1; // from server (0-255)
    accumMs = conf.UPDATE_MS;
    map = null;
    graphics;
    input;

    worldHistory = new WorldHistory(Game.MAX_WORLD_HISTORY);
    historyChanged = false;

    constructor(graphics, input) {
        this.graphics = graphics;
        this.input = input;

        // initial world state
        this.worldHistory.push(new WorldState());
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
        const inputState = player.sampleInput(this.input);
        net.sendInput(inputState);

        // Add a new world state
        this.worldHistory.push(this.worldHistory.get(-1));
        const newWorldState = this.worldHistory.get(-1);

        newWorldState.player.inputState = inputState;

        let simulateFrom = this.worldHistory.size-2;
        if (this.historyChanged) {
            simulateFrom = 0;
        }

        for (let i = simulateFrom; i < this.worldHistory.size-1; i++) {
            const from = this.worldHistory.get(i);
            const to = this.worldHistory.get(i+1);
            this._simulate(from, to);
        }

        this.input.reset(); // do last
    }

    _simulate(from, to) {
        // move projectiles before spawning new ones (gives an additional tick for lagg compensation)
        weapons.update(this);
        player.update(this.world);
        this.removeDisconnectedPlayers();
    }

    _render() {
        this.graphics.drawGame(this);
    }

    removeDisconnectedPlayers() {
        for (let i = this.world.otherPlayers.length-1; i >= 0; i--) { // loop backwards for removing elements
            let otherPlayer = this.world.otherPlayers[i];
            if (!otherPlayer.disconnected) {
                continue;
            }
            this.world.otherPlayers.splice(i, 1);
        }
    }
}

export { Game };