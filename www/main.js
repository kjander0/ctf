// TODO
// - hard limit number unacked packets (1 second worth?) in case server running slow, etc
// - handle switching browser tab (ignore first huge delta time, etc)
// - serve minified versions of PIXI for release
// - bundle the js
// - juicify (screen shake on death)

import { Game } from "./game.js"
import { Input } from "./input.js";
import { Graphics } from "./graphics.js";
import * as net from "./net.js";
import * as conf from "./conf.js";
import * as asset from "./assets.js";

window.onload = async function() {
    await conf.retrieveConf(); // important to do this first
    await asset.loadAssets();

    const canvas = document.getElementById("glcanvas");
    const graphics = new Graphics(canvas);
    const input = new Input(graphics);

    let game = new Game(graphics, input);

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