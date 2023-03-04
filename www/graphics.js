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

    drawLevel(rows) {
        gfx.setColor(0.3, 0.3, 0.3);
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                if (rows[r][c] !== Map.WALL) {
                    continue;
                }
                gfx.drawRect(c * conf.TILE_SIZE, (r) * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE);
            }
        }
    }

    update(world) {
        if (world.map !== null) {
            this.drawLevel(world.map.rows);
        }

        let lerpFraction = world.accumMs/conf.UPDATE_MS;
        let lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);
        gfx.setColor(0.4, 0.8, 0.4);
        gfx.drawCircle(lerpPos.x, lerpPos.y, conf.PLAYER_RADIUS);
        gfx.setColor(0, 1, 0);
        gfx.drawCircleLine(world.player.lastAckedPos.x, world.player.lastAckedPos.y, conf.PLAYER_RADIUS);
        gfx.setColor(0, 0, 1);
        gfx.drawCircleLine(world.player.correctedPos.x, world.player.correctedPos.x, conf.PLAYER_RADIUS);
    
        gfx.setCamera(lerpPos.x, lerpPos.y);
    
        for (let other of world.otherPlayers) {
            let lerpPos = lerpVec(other.prevPos, other.pos, lerpFraction);
            gfx.setColor(0.8, 0.4, 0.4);
            gfx.drawCircle(lerpPos.x, lerpPos.y, conf.PLAYER_RADIUS);
            gfx.setColor(0, 0, 1);
            gfx.drawCircle(other.lastAckedPos.x, other.lastAckedPos.y, conf.PLAYER_RADIUS);
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

        gfx.render();
    }
}

export {Graphics};