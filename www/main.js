// TODO
// - hard limit number unacked packets (1 second worth?) in case server running slow, etc
// - handle switching browser tab (ignore first huge delta time, etc)
// - serve minified versions of PIXI for release
// - bundle the js
// - juicify (screen shake on death)

import {World} from "./world.js"
import * as input from "./input.js";
import * as player from "./player.js";
import * as weapons from "./weapons.js";
import * as net from "./net.js";
import * as conf from "./conf.js";
import * as gfx from "./gfx/gfx.js";

window.onload = async function() {
    await conf.retrieveConf(); // important to do this first

    const canvas = document.getElementById("glcanvas");
    gfx.init(canvas);

    let world = new World();
    world.player = new player.Player();

    await net.connect(world);

    function update(world) {
        if (world.serverTick === -1) {
            return; // wait until we have a world update from server
        }
        world.accumMs += world.deltaMs;

        if (world.accumMs < conf.UPDATE_MS) {
            return;
        }

        if (world.clientTick === -1) {
            world.clientTick = world.serverTick;
        }

        world.accumMs = Math.min(world.accumMs - conf.UPDATE_MS, conf.UPDATE_MS);
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
    function onFrame() {
        if (net.socket.readyState === WebSocket.CLOSED) {
            return;
        }
        // TODO: want deltaMS to be bounded
        world.deltaMs = window.performance.now() - prevTime;
        prevTime = window.performance.now();
        update(world); // TODO: can't assume called at 60fps, e.g. my display getting 75fps (might want a custom timer?)
        world.gfx.update(world);
        window.requestAnimationFrame(onFrame);
    }
    window.requestAnimationFrame(onFrame);
};

function removeDisconnectedPlayers(world) {
    for (let i = world.otherPlayers.length-1; i >= 0; i--) { // loop backwards for removing elements
        let otherPlayer = world.otherPlayers[i];
        if (!otherPlayer.disconnected) {
            continue;
        }
        world.otherPlayers.splice(i, 1);
    }
}