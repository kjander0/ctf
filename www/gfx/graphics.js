import {lerpVec, extrapolateVec} from "../interpolate.js";
import { Vec, Transform } from "../math.js";
import {Tile} from "../map.js";
import {Laser} from "../weapons.js";
import * as conf from "../conf.js";
import { Renderer } from "./renderer.js";
import { Color } from "./color.js";
import { Mesh, Model, VertAttrib} from "./mesh.js";
import { Shader } from "./shader.js";
import { Texture } from "./texture.js";
import { Camera } from "./camera.js";
import { gl } from "./gl.js";
import * as assets from "../assets.js";

const ATTRIB_LIGHT_POS_LOC = 3;

// tree of containers

// TODO
// - pre-allocate STREAM vbo's for buffer streaming
class Graphics {
    camera = new Camera();
    uiCamera = new Camera();

    renderer;
    canvas;

    screenSize = new Vec();

    // offscreen render textures
    albedoTex = null;
    normalTex = null;
    highlightTex = null;
    finalTex = null;

    shipAlbedoTex;
    shipNormalTex;

    // shaders
    lightsShader;
    spriteShader;
    finalShader;
    shapeShader;
    texShader;

    constructor (canvas) {
        this.canvas = canvas;

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        this.renderer = new Renderer(gl);

        this.lightsShader = new Shader(gl, assets.lightsVertSrc, assets.lightsFragSrc);
        this.spriteShader = new Shader(gl, assets.spriteVertSrc, assets.spriteFragSrc);
        this.gammaShader = new Shader(gl, assets.texVertSrc, assets.gammaFragSrc);

        this.shipAlbedoTex = Texture.fromImage(assets.shipAlbedoImage, true);
        this.shipNormalTex = Texture.fromImage(assets.shipNormalImage, false);
        this.floorAlbedoTex = Texture.fromImage(assets.floorAlbedoImage, true);
        this.floorNormalTex = Texture.fromImage(assets.floorNormalImage, false);
        this.wallAlbedoTex = Texture.fromImage(assets.wallAlbedoImage, true);
        this.wallNormalTex = Texture.fromImage(assets.wallNormalImage, false);
        this.cornerTriangleAlbedoTex = Texture.fromImage(assets.cornerTriangleAlbedoImage, true);
        this.cornerTriangleNormalTex = Texture.fromImage(assets.cornerTriangleNormalImage, false);
        this.triangleAlbedoTex = Texture.fromImage(assets.triangleAlbedoImage, true);
        this.triangleNormalTex = Texture.fromImage(assets.triangleNormalImage, false);
        this.flagTex = Texture.fromImage(assets.flagImage, true);
    
        const resizeObserver = new ResizeObserver(() => {
            this._onresize();
        });
        resizeObserver.observe(this.canvas);
    
        this._onresize(); // initial resize
    }

    _onresize() {
        // TODO: throttle resize with timer!!!
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.screenSize.set(gl.drawingBufferWidth, gl.drawingBufferHeight);
    
        gl.viewport(0, 0, this.screenSize.x, this.screenSize.y);

        this.albedoTex = Texture.fromSize(
            this.screenSize.x,
            this.screenSize.y,
        );
        this.normalTex = Texture.fromSize(
            this.screenSize.x,
            this.screenSize.y,
        );
        this.highlightTex = Texture.fromSize(
            this.screenSize.x,
            this.screenSize.y,
        );
        this.finalTex = Texture.fromSize (
            this.screenSize.x,
            this.screenSize.y,
        );
    }

    drawGame(game) {
        this.uiCamera.update(this.screenSize.x/2, this.screenSize.y/2, this.screenSize.x, this.screenSize.y);

        const lerpFraction = game.accumMs/conf.UPDATE_MS;
        const lerpPos = lerpVec(game.player.prevPos, game.player.pos, lerpFraction);

        this.camera.update(lerpPos.x, lerpPos.y, this.screenSize.x, this.screenSize.y);

        let shipRadius = conf.PLAYER_RADIUS / assets.shipPixelRatio;

        let shipPositions = [lerpPos]
        for (let other of game.otherPlayers) {
            const lerpPos = lerpVec(other.prevPos, other.pos, lerpFraction);
            shipPositions.push(lerpPos);
        }

        // ========== DRAW NORMALS ==========
        gl.clearColor(0.0, 0.0, 0.0, 0.0); // < 1 in alpha channel for normals means no lighting
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        const rows = game.map.tileRows;
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                const tile = rows[r][c];
                switch (tile.type) {
                    case Tile.WALL:
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.wallNormalTex);
                        break;
                    case Tile.WALL_TRIANGLE:
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.floorNormalTex);
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.triangleNormalTex, tile.orientation);
                        break;
                    case Tile.WALL_TRIANGLE_CORNER:
                        //TODO
                        // TODO:
                        // - normals below causing trouble
                        // - can't just supply rotated version if lighting isn't directly from above!
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.floorNormalTex);
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.cornerTriangleNormalTex, tile.orientation);
                        break;
                    default:
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.floorNormalTex);
                        break;
                }
            }
        }

        for (let pos of shipPositions) {
            this.renderer.drawTexture(pos.x - shipRadius, pos.y - shipRadius, shipRadius * 2, shipRadius * 2, this.shipNormalTex);
        }

        this.renderer.setAndClearTarget(this.normalTex);
        this.renderer.render(this.camera);

        // ========= DRAW ALBEDO ==========
        gl.clearColor(0.3, 0.1, 0.5, 1.0);

        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                const tile = rows[r][c];
                switch (tile.type) {
                    case Tile.WALL:
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.wallAlbedoTex);
                        break;
                    case Tile.WALL_TRIANGLE:
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.floorAlbedoTex);
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.triangleAlbedoTex, tile.orientation);
                        break;
                    case Tile.WALL_TRIANGLE_CORNER:
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.floorAlbedoTex);
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.cornerTriangleAlbedoTex, tile.orientation);
                        break;
                    default:
                        this.renderer.drawTexture(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE, this.floorAlbedoTex);
                        break;
                }
            }
        }
        
        for (let pos of shipPositions) {
            this.renderer.drawTexture(pos.x - shipRadius, pos.y - shipRadius, shipRadius * 2, shipRadius * 2, this.shipAlbedoTex);
        }

        this.renderer.setAndClearTarget(this.albedoTex);
        this.renderer.render(this.camera);

        let lightsMesh = new Mesh(VertAttrib.POS_BIT);
        const lightRadius = 150;
        lightsMesh.addCircle(0, 0, lightRadius);

        let lightPosData = [];
        for (let laser of game.laserList) {
            const numPoints = laser.drawPoints.length;
            let lastSegment = laser.drawPoints[numPoints-1].sub(laser.drawPoints[numPoints-2]);
            let segmentLen = lastSegment.length();
            let targetLen = Math.max(segmentLen - (1-lerpFraction) * laser.getSpeed(), 0);
            let lightPos = laser.drawPoints[numPoints-2].add(lastSegment.scale(targetLen/segmentLen));
            lightPosData.push(lightPos.x, lightPos.y);
        }

        let lightPosAttrib = new VertAttrib(ATTRIB_LIGHT_POS_LOC, 2, gl.FLOAT, 1);
        lightPosAttrib.data = lightPosData;

        this.lightsShader.setUniform("uScreenSize", [this.screenSize.x, this.screenSize.y]);
        this.lightsShader.setUniform("uRadius", lightRadius);

        let lightsModel = new Model(
            gl,
            lightsMesh,
            gl.TRIANGLES,
            this.lightsShader,
            [this.normalTex],
            [lightPosAttrib],
            lightPosData.length/2,
        );
        this.renderer.drawModel(lightsModel);
        gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA); // combine lights equally
        gl.clearColor(0, 0, 0, 0);
        this.renderer.setAndClearTarget(this.highlightTex);
        this.renderer.render(this.camera);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // this.renderer.drawTexture(0, 0, this.screenSize.x, this.screenSize.y, this.highlightTex);
        // this.renderer.setAndClearTarget(null);
        // this.renderer.render(this.uiCamera);

        let screenMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_BIT);
        screenMesh.addRect(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        let spriteModel = new Model(
            gl,
            screenMesh,
            gl.TRIANGLES,
            this.spriteShader,
            [this.albedoTex, this.highlightTex]
        );
        this.renderer.drawModel(spriteModel);
        this.renderer.setAndClearTarget(this.finalTex);
        this.renderer.render(this.uiCamera);

        let screenModel = new Model(
            gl,
            screenMesh,
            gl.TRIANGLES,
            this.gammaShader,
            [this.finalTex]
        );
        this.renderer.drawModel(screenModel);
        this.renderer.setAndClearTarget(null);
        this.renderer.render(this.uiCamera);
        
        if (game.doDebug) {
            this.renderer.setColor(0, 1, 0);
            this.renderer.drawCircleLine(game.player.acked.pos.x, game.player.acked.pos.y, conf.PLAYER_RADIUS);
            this.renderer.setColor(0, 0, 1);
            this.renderer.drawCircleLine(game.player.predicted.pos.x, game.player.predicted.pos.y, conf.PLAYER_RADIUS);

            for (let other of game.otherPlayers) {
                this.renderer.setColor(0, 1, 0);
                this.renderer.drawCircleLine(other.acked.pos.x, other.acked.pos.y, conf.PLAYER_RADIUS);
            }
        }

        // ========== BEGIN DRAW LASERS ==========
        this.renderer.setColor(1, 0, 0);
        for (let laser of game.laserList) {
            const drawStartDist = lerpFraction * laser.getSpeed();
            const drawEndDist = laser.getDrawLength() - (1-lerpFraction) * laser.getSpeed();
            if (drawStartDist >= drawEndDist) {
                continue;
            }
            let dist = 0;
            for (let i = 0; i < laser.drawPoints.length-1; i++) {
                let start = laser.drawPoints[i];
                let end = laser.drawPoints[i+1];
                const segmentDir = end.sub(start);
                const segmentLen = segmentDir.length();

                let segmentStartDist = dist;
                let segmentEndDist = dist + segmentLen;

                if (segmentEndDist <= drawStartDist || segmentStartDist >= drawEndDist) {
                    dist += segmentLen;
                    continue;
                }

                if (segmentStartDist < drawStartDist) {
                    start = start.add(segmentDir.scale((drawStartDist - segmentStartDist)/segmentLen));
                    segmentStartDist = drawStartDist;
                }

                if (segmentEndDist > drawEndDist) {
                    end = end.sub(segmentDir.scale((segmentEndDist - drawEndDist)/segmentLen));
                    segmentEndDist = drawEndDist;
                }
                dist += segmentLen;

                let lineWidth;
                switch (laser.type) {
                    case Laser.TYPE_LASER:
                        lineWidth = 2;
                        break;
                    case Laser.TYPE_BOUNCY:
                        lineWidth = 3;
                        break;
                    default:
                        throw "unsupported laser type";
                }
                const startColor = new Color(1, 0, 0, 0);
                const endColor = new Color(1, 0.2, 0.2, 1);
                const segmentStartFraction = (segmentStartDist - drawStartDist) / (drawEndDist - drawStartDist);
                const segmentEndFraction = (segmentEndDist - drawStartDist) / (drawEndDist - drawStartDist);
                const segmentStartColor = startColor.lerp(endColor, segmentStartFraction);
                const segmentEndColor = startColor.lerp(endColor, segmentEndFraction);
                this._drawLaserLine(this.renderer.shapeMesh, start, end, lineWidth, segmentStartColor, segmentEndColor);
            }
        }
        // ========== END DRAW LASERS ==========

        for (let flagIndex = 0; flagIndex < game.flagList.length; flagIndex++) {
            let flagPos = game.flagList[flagIndex];
            console.log(flagIndex, game.player.flagIndex);
            if (game.player.flagIndex === flagIndex) {
                flagPos = lerpVec(game.player.prevPos, game.player.pos, lerpFraction);
            }
            for (let player of game.otherPlayers) {
                if (player.flagIndex === flagIndex) {
                    flagPos = lerpVec(player.prevPos, player.pos, lerpFraction);
                    break;
                }
            }
            this.renderer.drawTexture(flagPos.x, flagPos.y, conf.TILE_SIZE, conf.TILE_SIZE, this.flagTex);
        }

        for (let emitter of game.emitterList) {
            this.renderer.drawModel(emitter.makeModel(gl));
        }
        
        this.renderer.render(this.camera);

        // ========== BEGIN DRAW UI ==========
        const border = 10;
        // Draw laser energy bar
        {
            const barWidth = 80;
            const barHeight = 10;
            const ratio = game.player.predicted.energy / conf.MAX_LASER_ENERGY;
            this.renderer.setColor(0.8, 0.1, 0.1);
            this.renderer.drawRect(this.screenSize.x/2 - barWidth/2, border, barWidth, barHeight);
            this.renderer.setColor(0.8, 0.8, 0);
            this.renderer.drawRect(this.screenSize.x/2 -barWidth/2, border, barWidth * ratio, barHeight);
        }

        // Draw bouncy energy stocks
        {
            const radius = 14;
            let remainingEnergy = game.player.predicted.bouncyEnergy;
            let bouncyNum = 0;
            while (remainingEnergy > 0) {
                const ratio = Math.min(1, remainingEnergy / conf.BOUNCY_ENERGY_COST);
                if (ratio < 1) {
                    this.renderer.setColor(1, 0.8 * ratio, 0);
                    this.renderer.drawCircle(border + radius + bouncyNum * (border + 2 * radius), border + radius, radius * ratio * 0.8);
                } else {
                    this.renderer.setColor(1, 1, 0);
                    this.renderer.drawCircle(border + radius + bouncyNum * (border + 2 * radius), border + radius, radius);
                }
                bouncyNum++;
                remainingEnergy -= conf.BOUNCY_ENERGY_COST;
            }
        }

        // Draw diagnostics (fps, latency, etc)
        {
            const height = 20;
            this.renderer.drawText("FPS: " + (1000 / game.deltaMs).toFixed(2), border, this.screenSize.y - border - height, assets.arialFont, height);
            this.renderer.drawText("PREDICTIONS: " + game.player.predictedInputs.unacked.length, border, this.screenSize.y - 2 * (border + height), assets.arialFont, height)
            if (game.doSpeedup) {
                this.renderer.drawText("SPEEDUP", border, this.screenSize.y - 3 * (border + height), assets.arialFont, height)
            }
        }

        this.renderer.render(this.uiCamera);
        // ========== END DRAW UI ==========


        // TODO: draw loading bouncies as rounded rects that load into place then shine
    }

    _drawLaserLine(mesh, start, end, width, startColor, endColor) {
        const diff = end.sub(start);
        const perp = new Vec(-diff.y, diff.x).setLength(width/2);
        // d----------c
        // |          |
        // a----------b
        const a = start.sub(perp);
        const b = end.sub(perp);
        const c = end.add(perp);
        const d = start.add(perp);
        mesh.setColor(startColor);
        mesh.add(a.x, a.y);
        mesh.setColor(endColor);
        mesh.add(b.x, b.y);mesh.add(c.x, c.y);
        mesh.add(c.x, c.y);
        mesh.setColor(startColor);
        mesh.add(d.x, d.y);
        mesh.add(a.x, a.y);

        // triangle end caps
        if (width > 1) {
            const capOffset = new Vec(diff).setLength(width/2);
            const startCap = start.sub(capOffset);
            const endCap = end.add(capOffset);
            mesh.setColor(startColor);
            mesh.add(a.x, a.y); mesh.add(d.x, d.y); mesh.add(startCap.x, startCap.y);
            mesh.setColor(endColor);
            mesh.add(c.x, c.y); mesh.add(b.x, b.y); mesh.add(endCap.x, endCap.y);
        }
    }
    
    _reduceLaserDrawLength(laser, targetLength) {
        let size = 0;
        for (let i = 0; i < laser.drawPoints.length-1; i++) {
            let p0 = laser.drawPoints[i];
            let p1 = laser.drawPoints[i+1];
            size += p0.distanceTo(p1);
        }
    
        while (size > targetLength) {
            const diff = size - targetLength;
            const disp = laser.drawPoints[1].sub(laser.drawPoints[0]);
            const dispLen = disp.length();
            if (dispLen <= diff) {
                size -= dispLen;
                laser.drawPoints.splice(0, 1);
                continue;
            }
    
            laser.drawPoints[0] = laser.drawPoints[0].add(disp.scale(diff/dispLen));
            break;
        }
    }
}

export {Graphics};