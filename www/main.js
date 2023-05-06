// TODO
// - prevent users from making massive map in editor and then not being able to export because it is too big
// - reconsider message size limits (e.g. 1024 in encode.js)
// - inputs tend to clump up with bad netowrk conditions. If server is consuming multiple inputs at the same time, it could fast
//      forward lasers by some limited amount so they get the true spread.
// - disable client collisions to test server collisions and vice versa
// - hard limit number unacked packets (1 second worth?) in case server running slow, etc
// - handle switching browser tab (ignore first huge delta time, etc)
// - serve minified versions of PIXI for release
// - bundle the js
// - juicify (screen shake on death)

import { Game } from "./game.js";
import { Input } from "./input.js";
import { Graphics } from "./gfx/graphics.js";
import * as net from "./net.js";
import * as conf from "./conf.js";
import * as assets from "./assets.js";
import { initGL } from "./gfx/gl.js";
import * as map from "./map/map.js";

window.onload = async function() {
    await conf.retrieveConf(); // important to do this first

    const canvas = document.getElementById("glcanvas");

    initGL(canvas);

    await assets.loadAssets();

    map.defineTileTypes();

    const graphics = new Graphics(canvas);
    const input = new Input(graphics);

    const testMap = await map.fromFile("assets/maps/test.bin");
    const game = new Game(graphics, input);
    game.map = testMap;

    await net.connect(game);

    let prevTime = window.performance.now();
    function onFrame() {
        if (net.socket.readyState === WebSocket.CLOSED) {
            return;
        }
        // TODO: want deltaMS to be bounded
        const deltaMs = window.performance.now() - prevTime;
        prevTime = window.performance.now();
        game.update(deltaMs); // TODO: can't assume called at 60fps, e.g. my display getting 75fps (might want a custom timer?)
        window.requestAnimationFrame(onFrame);
    }
    window.requestAnimationFrame(onFrame);
};