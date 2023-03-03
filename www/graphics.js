import {lerpVec, extrapolateVec} from "./interpolate.js";
import { Vec } from "./math.js";
import {Map} from "./map.js";
import * as conf from "./conf.js";
import * as gfx from "./gfx/gfx.js";

class Graphics {
    constructor() {

    }

    moveCamera(x, y) {
        gfx.setCamera(x, y);
    }

    unproject(pos) {
        let p = new PIXI.Point(pos.x, pos.y);
        let m = this.camContainer.localTransform;
        m.applyInverse(p, p);
        return new Vec(p.x, p.y);
    }

    // drawLevel(rows) {
    //     let g = new PIXI.Graphics();
    //     g.beginFill(0x555555);
    //     for (let r = 0; r < rows.length; r++) {
    //         for (let c = 0; c < rows[r].length; c++) {
    //             if (rows[r][c] !== Map.WALL) {
    //                 continue;
    //             }
    //             g.drawRect(c * conf.TILE_SIZE, (r) * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE);
    //         }
    //     }
    //     this.camContainer.addChild(g);
    // }

    update(world) {
        let lerpFraction = world.accumMs/conf.UPDATE_MS;
        let lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);
        gfx.drawCircle(lerpPos.x, lerpPos.y, 30);
        gfx.drawCircle(world.player.lastAckedPos.x, world.player.lastAckedPos.y, 30);
        gfx.drawCircle(world.player.correctedPos.x, world.player.correctedPos.x, 30);
    
        gfx.setCamera(lerpPos.x, lerpPos.y);
    
    
        for (let other of world.otherPlayers) {
            let lerpPos = lerpVec(other.prevPos, other.pos, lerpFraction);
            gfx.drawCircle(lerpPos.x, lerpPos.y, 30);
            gfx.drawCircle(world.player.lastAckedPos.x, world.player.lastAckedPos.y, 30);
        }
    
        // this.lineGfx.clear();
        // this.lineGfx.lineStyle(1, 0xff0000, 1);
        // for (let laser of world.laserList) {
        //     this.lineGfx.moveTo(laser.line.start.x, laser.line.start.y);
        //     this.lineGfx.lineTo(laser.line.end.x, laser.line.end.y);
        // }
    
        // // Draw UI
        // this.uiGfx.clear();
        // let border = 10;
        // let barWidth = 80;
        // let barHeight = 10;
        // this.uiGfx.beginFill(0xaaaa00);
        // let ratio = world.player.energy / conf.PLAYER_ENERGY;
        // this.uiGfx.drawRect(this.screenRect.width/2 - barWidth/2, this.screenRect.height - barHeight - border, barWidth * ratio, barHeight);
        // this.uiGfx.endFill();
        // this.uiGfx.lineStyle(2, 0xaa2222);
        // this.uiGfx.drawRect(this.screenRect.width/2 - barWidth/2, this.screenRect.height - barHeight - border, barWidth, barHeight);
    }
}

export {Graphics};