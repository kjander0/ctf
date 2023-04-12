// TODO
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
import * as asset from "./assets.js";

window.onload = async function() {
    await conf.retrieveConf(); // important to do this first

    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        stencil: false,
        // TODO: try enable antialias
    });
    if (gl === null) {
        throw "could not get webgl2 context";
    }

    await asset.loadAssets(gl);

    const graphics = new Graphics(canvas, gl);
    const input = new Input(graphics);

    const game = new Game(graphics, input);

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