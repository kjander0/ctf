import {lerpVec, extrapolateVec} from "./interpolate.js";
import { Vec } from "./math.js";
import {Map} from "./map.js";
import * as conf from "./conf.js";
import * as gfx from "./gfx/gfx.js";

class Graphics {
    camera = new gfx.Camera();
    uiCamera = new gfx.Camera();

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

        const screenWidth = gfx.gl.drawingBufferWidth;
        const screenHeight = gfx.gl.drawingBufferHeight;

        gfx.gl.clear(gfx.gl.COLOR_BUFFER_BIT);

        let lerpFraction = world.accumMs/conf.UPDATE_MS;
        let lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);
        gfx.setColor(0.4, 0.8, 0.4);
        gfx.drawCircle(lerpPos.x, lerpPos.y, conf.PLAYER_RADIUS);
        gfx.setColor(0, 1, 0);
        gfx.drawCircleLine(world.player.lastAckedPos.x, world.player.lastAckedPos.y, conf.PLAYER_RADIUS);
        gfx.setColor(0, 0, 1);
        gfx.drawCircleLine(world.player.correctedPos.x, world.player.correctedPos.y, conf.PLAYER_RADIUS);
        
        this.camera.update(lerpPos.x, lerpPos.y, screenWidth, screenHeight);
    
        for (let other of world.otherPlayers) {
            let lerpPos = lerpVec(other.prevPos, other.pos, lerpFraction);
            gfx.setColor(0.8, 0.4, 0.4);
            gfx.drawCircle(lerpPos.x, lerpPos.y, conf.PLAYER_RADIUS);
            gfx.setColor(0, 0, 1);
            gfx.drawCircle(other.lastAckedPos.x, other.lastAckedPos.y, conf.PLAYER_RADIUS);
        }

        gfx.setColor(1, 0, 0);
        for (let laser of world.laserList) {
            gfx.drawLine(laser.line.start, laser.line.end, 3);
        }

        gfx.render(this.camera);

        // Draw UI
        this.uiCamera.update(0, 0, screenWidth, screenHeight);
        let border = 10;
        let barWidth = 80;
        let barHeight = 10;
        let ratio = world.player.energy / conf.PLAYER_ENERGY;
        gfx.setColor(0.8, 0.1, 0.1);
        gfx.drawRect(-barWidth/2, -screenHeight/2 + border, barWidth, barHeight);
        gfx.setColor(0.8, 0.8, 0);
        gfx.drawRect(-barWidth/2, -screenHeight/2 + border, barWidth * ratio, barHeight);

        gfx.render(this.uiCamera);
    }
}

export {Graphics};