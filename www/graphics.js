import {lerpVec, extrapolateVec} from "./interpolate.js";
import { Vec } from "./math.js";
import {Map} from "./map.js";
import * as conf from "./conf.js";

class Graphics {
    camContainer;
    screenRect;
    lineGfx = new PIXI.Graphics();

    constructor(pixiApp) {
        this.screenRect = pixiApp.screen;
        this.camContainer = new PIXI.Container();
        this.camContainer.scale.y = -1;
        pixiApp.stage.addChild(this.camContainer);
        this.camContainer.addChild(this.lineGfx);
        pixiApp.renderer.on("resize", (w, h) => { this.resize(w, h) });
        this.resize(this.screenRect.width, this.screenRect.height);
    }

    moveCamera(x, y) {
        let centreOffsetX = x - this.screenRect.width/2;
        let centreOffsetY = y - this.screenRect.height/2;
        this.camContainer.position.x = -centreOffsetX;
        this.camContainer.position.y = this.screenRect.height + centreOffsetY;
    }

    unproject(pos) {
        let p = new PIXI.Point(pos.x, pos.y);
        let m = this.camContainer.localTransform;
        m.applyInverse(p, p);
        return new Vec(p.x, p.y);
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

    addLevel(rows) {
        let g = new PIXI.Graphics();
        g.beginFill(0x555555);
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                if (rows[r][c] == Map.EMPTY) {
                    continue;
                }
                g.drawRect(c * conf.TILE_SIZE, (r) * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE);
            }
        }
        this.camContainer.addChild(g);
    }

    addHit(pos) {
        let g = new PIXI.Graphics();
        g.beginFill(0xff0000);
        g.drawCircle(pos.x, pos.y, 2);
        g.endFill();
        this.camContainer.addChild(g);
        return g;
    }

    remove(graphic) {
        this.camContainer.removeChild(graphic);
        graphic.destroy();
    }
}

function update(world) {
    let lerpFraction = world.accumMs/conf.UPDATE_MS;
    let lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);
    world.player.graphic.x = lerpPos.x;
    world.player.graphic.y = lerpPos.y;
    world.player.lastAckedGraphic.x = world.player.lastAckedPos.x;
    world.player.lastAckedGraphic.y = world.player.lastAckedPos.y;
    world.player.correctedGraphic.x = world.player.correctedPos.x;
    world.player.correctedGraphic.y = world.player.correctedPos.y;

    world.gfx.moveCamera(lerpPos.x, lerpPos.y);


    for (let other of world.otherPlayers) {
        let lerpPos = lerpVec(other.prevPos, other.pos, lerpFraction);
        other.graphic.x = lerpPos.x;
        other.graphic.y = lerpPos.y;
        other.lastAckedGraphic.x = other.lastAckedPos.x;
        other.lastAckedGraphic.y = other.lastAckedPos.y;
    }

    let lineGfx = world.gfx.lineGfx;
    lineGfx.clear();
    lineGfx.lineStyle(1, 0xff0000, 1);
    for (let laser of world.laserList) {
        console.log(laser.line);
        lineGfx.moveTo(laser.line.start.x, laser.line.start.y);
        lineGfx.lineTo(laser.line.end.x, laser.line.end.y);
    }
}

export {Graphics, update}