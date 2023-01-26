// TODO
// - hard limit number unacked packets (1 second worth?) in case server running slow, etc
// - handle switching browser tab (ignore first huge delta time, etc)
// - serve minified versions of PIXI for release
// - bundle the js

import * as graphics from "./graphics.js";
import * as input from "./input.js";
import * as player from "./player.js";
import * as net from "./net.js"
import * as time from "./time.js"

window.onload = async function() {
    if(!PIXI.utils.isWebGLSupported()){
        console.log("webGL not supported");
    }

    let container = document.body;
    let pixiApp = new PIXI.Application({
        resizeTo: container,
        backgroundColor: 0x000000
    });
    
    container.appendChild(pixiApp.view);
    let world = {
        deltaMs: 1000.0/60.0,
        accumMs: 0,
        serverAccumMs: 0, // time accumulation for server updates from server
        doThrottle: false,
        input: new input.Input(pixiApp.view),
        gfx: new graphics.Graphics(pixiApp),
        player: new player.Player(),
        otherPlayers: [],
        //map: new tilemap.TileMap(),
    };
    world.player.graphic = world.gfx.addCircle(0x00AA33);
    world.player.lastAckedGraphic = world.gfx.addCircle(0xFF0000, false);
    world.player.correctedGraphic = world.gfx.addCircle(0x0000FF, false);

    await net.connect(world);

    let updateCount = 0;
    function update(world) {
        world.accumMs += world.deltaMs;
        let targetMs = time.CLIENT_UPDATE_MS;
        if (world.doThrottle) {
            targetMs = time.THROTTLED_UPDATE_MS;
        }

        if (world.accumMs < targetMs) {
            return;
        }
        world.accumMs = Math.min(world.accumMs - targetMs, targetMs);
        
        net.sendInput(world);
        player.update(world);
        //console.log("COUNT: ", updateCount++);
        removeDisconnectedPlayers(world);
        input.postUpdate(world); // do last
    }

    let prevTime = window.performance.now();
    pixiApp.ticker.add(function () {
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