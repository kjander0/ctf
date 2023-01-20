// TODO
// - serve minified versions of PIXI for release

import { Graphics } from "./graphics.js";
import { Vec } from "./math.js";
import { Input } from "./input.js";

let player = {
    pos: new Vec(),
}

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

    let input = new Input(pixiApp.view);
    let gfx = new Graphics(document.body);

    pixiApp.ticker.add(function () {
        let dt = pixiApp.ticker.elapsedMS/1000.0;
		USE TIMING CLASS OR MAYBE RELY ON PIXI Ticker, CHECK ITS SOURCE
	});
};