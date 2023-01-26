import {lerpVec, extrapolateVec} from "./interpolate.js"
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
        this.resize(this.screenRect.width, this.screenRect.height);

    }

    moveCamera(x, y) {
        let centreOffsetX = x - this.screenRect.width/2;
        let centreOffsetY = y - this.screenRect.height/2;
        this.camContainer.position.x = -centreOffsetX;
        this.camContainer.position.y = this.screenRect.height + centreOffsetY;
    }

    resize(screenWidth, screenHeight) {
        console.log("resize: ", screenWidth, screenHeight);
        this.moveCamera(screenWidth/2, screenHeight/2);
    }

    addCircle(color, fill=true) {
        // TODO: reuse pixi.Geometry for each instance of a drawable
        let p = new PIXI.Graphics();
        if (fill) {
            p.beginFill(color);
        } else {
            p.lineStyle(1, color);
        }
        p.drawCircle(0, 0, 10);
        if (fill) {
            p.endFill();
        }
        this.camContainer.addChild(p);
        return p;
    }

    remove(graphic) {
        this.camContainer.removeChild(graphic);
        graphic.destroy();
    }
}

function update(world) {
    // Limit extrapolation to +/- one tick
    world.serverAccumMs = Math.max(-time.SERVER_UPDATE_MS, Math.min(2 * time.SERVER_UPDATE_MS, world.serverAccumMs + world.deltaMs));

    let lerpFraction = world.accumMs/time.SERVER_UPDATE_MS;
    let lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);
    world.player.graphic.x = lerpPos.x;
    world.player.graphic.y = lerpPos.y;
    world.player.lastAckedGraphic.x = world.player.lastAckedPos.x;
    world.player.lastAckedGraphic.y = world.player.lastAckedPos.y;
    world.player.correctedGraphic.x = world.player.correctedPos.x;
    world.player.correctedGraphic.y = world.player.correctedPos.y;

    let serverLerpFraction = world.serverAccumMs/time.SERVER_UPDATE_MS;
    for (let other of world.otherPlayers) {
        let lerpPos = extrapolateVec(other.prevPos, other.pos, serverLerpFraction);
        console.log(serverLerpFraction);
        other.graphic.x = lerpPos.x;
        other.graphic.y = lerpPos.y;
        //other.graphic.x = other.pos.x;
        //other.graphic.y = other.pos.y;
    }
}

export {Graphics, update}