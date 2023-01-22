// TODO
// - serve minified versions of PIXI for release

import * as graphics from "./graphics.js";
import * as input from "./input.js";
import * as time from "./time.js";

const TICK_RATE = 30.0;

window.onload = function() {
    if(!PIXI.utils.isWebGLSupported()){
        console.log("webGL not supported");
    }

    let container = document.body;
    let pixiApp = new PIXI.Application({
        resizeTo: container,
        backgroundColor: 0x1099bb
    });
    
    container.appendChild(pixiApp.view);

    let world = {
        updateSecs: = 1.0/TICK_RATE,
        input: new input.Input(pixiApp.view),
        gfx: new graphics.Graphics(document.body),
        player: new player.Player(),
    };

    let updateTimer = new time.Ticker(TICK_RATE, (dt) => {
        // net.update(world);
        player.update(world);
        input.update(world);
    });
    updateTimer.start();

    pixiApp.ticker.add(function () {
        let dt = pixiApp.ticker.elapsedMS/1000.0;
        graphics.update(world);
	});
};