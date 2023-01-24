// TODO
// - serve minified versions of PIXI for release
// - bundle the js

import * as graphics from "./graphics.js";
import * as input from "./input.js";
import * as time from "./time.js";
import * as player from "./player.js";
import * as tilemap from "./tilemap.js";
import * as net from "./net.js"

const TICK_RATE = 30.0;

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
        updateSecs: 1.0/TICK_RATE,
        renderSecs: 1.0/60.0,
        input: new input.Input(pixiApp.view),
        gfx: new graphics.Graphics(pixiApp),
        player: new player.Player(),
        //map: new tilemap.TileMap(),
    };
    world.player.graphic = world.gfx.addPlayer();

    await net.connect();

    let updateCount = 0;
    let updateTimer = new time.Ticker(TICK_RATE, (dt) => {
        net.consumeMessages(world);
        Need to throttle to keep in sync with server. Server can see how many inputs it has
        buffered and should send a thottle signal.
        net.sendInput(world);
        player.update(world);
        input.update(world);
        console.log("COUNT: ", updateCount++);
    });
    updateTimer.start();

    pixiApp.ticker.add(function () {
        world.renderSecs = pixiApp.ticker.elapsedMS/1000.0;
        DRAW last acked pos and predicted pos
        graphics.update(world);
	});
};