// TODO
// - hard limit number unacked packets (1 second worth?) in case server running slow, etc
// - handle switching browser tab (ignore first huge delta time, etc)
// - serve minified versions of PIXI for release
// - bundle the js

import {World} from "./world.js"
import * as graphics from "./graphics.js";
import * as input from "./input.js";
import * as player from "./player.js";
import * as weapons from "./weapons.js";
import * as net from "./net.js";
import * as time from "./time.js";

window.onload = async function() {
    let container = document.body;
    let pixiApp = new PIXI.Application({
        resizeTo: container,
        backgroundColor: 0x000000
    });    
    container.appendChild(pixiApp.view);

    let world = new World(pixiApp);
    world.player = new player.Player();
    world.player.graphic = world.gfx.addCircle(0x00AA33, false);
    world.player.lastAckedGraphic = world.gfx.addCircle(0xFF0000, false);
    world.player.correctedGraphic = world.gfx.addCircle(0x0000FF, false);

    await net.connect(world);

    function update(world) {
        if (world.serverTick === -1) {
            return; // wait until we have a world update from server
        }

        world.accumMs += world.deltaMs;

        if (world.accumMs < time.UPDATE_MS) {
            return;
        }

        if (world.clientTick === -1) {
            world.clientTick = world.serverTick;
        }

        world.accumMs = Math.min(world.accumMs - time.UPDATE_MS, time.UPDATE_MS);
        player.sampleInput(world);
        net.sendInput(world);
        // move projectiles before spawning new ones (gives an additional tick for lagg compensation)
        weapons.update(world);
        player.update(world);
        removeDisconnectedPlayers(world);
        input.postUpdate(world); // do last

        world.clientTick = (world.clientTick + 1) % 256;
    }

    let prevTime = window.performance.now();
    pixiApp.ticker.add(function () {
        if (net.socket.readyState === WebSocket.CLOSED) {
            return;
        }
        // TODO: want elapsedMS to be bounded
        world.deltaMs = pixiApp.ticker.elapsedMS;
        update(world);
        graphics.update(world);
        prevTime = window.performance.now();
	});
};

function removeDisconnectedPlayers(world) {
    for (let i = world.otherPlayers.length-1; i >= 0; i--) { // loop backwards for removing elements
        let otherPlayer = world.otherPlayers[i];
        if (!otherPlayer.disconnected) {
            continue;
        }
        world.gfx.remove(otherPlayer.graphic);
        world.otherPlayers.splice(i, 1);
    }
}