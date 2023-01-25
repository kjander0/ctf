import {lerpVec} from "./interpolate.js"
import * as time from "./time.js"

class Graphics {
    camContainer;
    screenRect;

    constructor(pixiApp) {
        this.screenRect = pixiApp.screen;
        this.camContainer = new PIXI.Container();
        this.camContainer.scale.y = -1;
        pixiApp.stage.addChild(this.camContainer);
        pixiApp.renderer.on("resize", (w, h) => { this.resize(w, h) });
    }

    moveCamera(x, y) {
        let centreOffsetX = x - this.screenRect.width/2;
        let centreOffsetY = y - this.screenRect.height/2;
        this.camContainer.position.x = -centreOffsetX;
        this.camContainer.position.y = this.screenRect.height + centreOffsetY;
    }

    resize(screenWidth, screenHeight) {
        this.moveCamera(screenWidth/2, screenHeight/2);
    }

    addCircle(color) {
        // TODO: reuse pixi.Geometry for each instance of a drawable
        let p = new PIXI.Graphics();
        p.beginFill(color);
        p.drawCircle(0, 0, 10);
        p.endFill();
        this.camContainer.addChild(p);
        return p;
    }
}

function update(world) {
    let lerpPos = lerpVec(world.player.prevPos, world.player.pos, world.accumMs/time.UPDATE_MS);
    world.player.graphic.x = lerpPos.x;
    world.player.graphic.y = lerpPos.y;
    world.player.lastAckedGraphic.x = world.player.lastAckedPos.x;
    world.player.lastAckedGraphic.y = world.player.lastAckedPos.y;
    world.player.correctedGraphic.x = world.player.correctedPos.x;
    world.player.correctedGraphic.y = world.player.correctedPos.y;
}

export {Graphics, update}