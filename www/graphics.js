import {lerpVec, extrapolateVec} from "./interpolate.js";
import { Vec } from "./math.js";
import {Map} from "./map.js";
import * as conf from "./conf.js";

class Graphics {
    pixiApp;
    camContainer;
    screenRect;
    lineGfx = new PIXI.Graphics();
    uiGfx = new PIXI.Graphics();

    constructor(pixiApp) {
        this.pixiApp = pixiApp;
        this.screenRect = pixiApp.screen;
        this.camContainer = new PIXI.Container();
        this.camContainer.scale.y = -1;
        pixiApp.stage.addChild(this.camContainer);
        pixiApp.stage.addChild(this.uiGfx);
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
                if (rows[r][c] !== Map.WALL) {
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

    update(world) {
        let lerpFraction = world.accumMs/conf.UPDATE_MS;
        let lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);
        world.player.graphic.x = lerpPos.x;
        world.player.graphic.y = lerpPos.y;
        world.player.lastAckedGraphic.x = world.player.lastAckedPos.x;
        world.player.lastAckedGraphic.y = world.player.lastAckedPos.y;
        world.player.correctedGraphic.x = world.player.correctedPos.x;
        world.player.correctedGraphic.y = world.player.correctedPos.y;
    
        this.moveCamera(lerpPos.x, lerpPos.y);
    
    
        for (let other of world.otherPlayers) {
            let lerpPos = lerpVec(other.prevPos, other.pos, lerpFraction);
            other.graphic.x = lerpPos.x;
            other.graphic.y = lerpPos.y;
            other.lastAckedGraphic.x = other.lastAckedPos.x;
            other.lastAckedGraphic.y = other.lastAckedPos.y;
        }
    
        this.lineGfx.clear();
        this.lineGfx.lineStyle(1, 0xff0000, 1);
        for (let laser of world.laserList) {
            this.lineGfx.moveTo(laser.line.start.x, laser.line.start.y);
            this.lineGfx.lineTo(laser.line.end.x, laser.line.end.y);
        }
    
        // Draw UI
        this.uiGfx.clear();
        let border = 10;
        let barWidth = 80;
        let barHeight = 10;
        this.uiGfx.beginFill(0xaaaa00);
        let ratio = world.player.energy / conf.PLAYER_ENERGY;
        this.uiGfx.drawRect(this.screenRect.width/2 - barWidth/2, this.screenRect.height - barHeight - border, barWidth * ratio, barHeight);
        this.uiGfx.endFill();
        this.uiGfx.lineStyle(2, 0xaa2222);
        this.uiGfx.drawRect(this.screenRect.width/2 - barWidth/2, this.screenRect.height - barHeight - border, barWidth, barHeight);
        this.pixiApp.stage.addChild(this.uiGfx);
    }
}

export {Graphics};