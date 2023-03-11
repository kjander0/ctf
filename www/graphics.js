import {lerpVec, extrapolateVec} from "./interpolate.js";
import { Vec } from "./math.js";
import {Map} from "./map.js";
import * as conf from "./conf.js";
import { Renderer } from "./gfx/renderer.js";
import { Mesh, Model, VertAttrib} from "./gfx/mesh.js";
import { Shader } from "./gfx/shader.js";
import { Texture } from "./gfx/texture.js";
import { Camera } from "./gfx/camera.js";
import * as assets from "./assets.js";

const ATTRIB_LIGHT_POS_LOC = 3;

class Sprite {
    albedoTex;
    normalTex;

    constructor(albedo, normal) {
        this.albedoTex = albedo;
        this.normalTex = normal;
    }
}

// tree of containers

// TODO
// - pre-allocate STREAM vbo's for buffer streaming
class Graphics {
    camera = new Camera();
    uiCamera = new Camera();

    renderer;
    canvas;
    gl;

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

    constructor (canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2", {
            alpha: false,
            depth: false,
            stencil: false,
            // TODO: try enable antialias
        });
    
        if (this.gl === null) {
            throw "could not get webgl2 context";
        }

        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        this.renderer = new Renderer(this.gl);

        this.lightsShader = new Shader(this.gl, assets.lightsVertSrc, assets.lightsFragSrc);
        this.spriteShader = new Shader(this.gl, assets.spriteVertSrc, assets.spriteFragSrc);
        this.gammaShader = new Shader(this.gl, assets.texVertSrc, assets.gammaFragSrc);

        this.shipAlbedoTex = Texture.fromImage(this.gl, assets.shipAlbedoImage, true);
        this.shipNormalTex = Texture.fromImage(this.gl, assets.shipNormalImage, false);
    
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

        this.screenSize.set(this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    
        this.gl.viewport(0, 0, this.screenSize.x, this.screenSize.y);

        this.albedoTex = Texture.fromSize(
            this.gl,
            this.screenSize.x,
            this.screenSize.y,
        );
        this.normalTex = Texture.fromSize(
            this.gl,
            this.screenSize.x,
            this.screenSize.y,
        );
        this.highlightTex = Texture.fromSize(
            this.gl,
            this.screenSize.x,
            this.screenSize.y,
        );
        this.finalTex = Texture.fromSize (
            this.gl,
            this.screenSize.x,
            this.screenSize.y,
        );
    }

    drawLevel(rows) {
        this.renderer.setColor(0.3, 0.3, 0.3);
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                if (rows[r][c] !== Map.WALL) {
                    continue;
                }
                this.renderer.drawRect(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE);
            }
        }
    }

    drawWorld(world) {
        this.uiCamera.update(this.screenSize.x/2, this.screenSize.y/2, this.screenSize.x, this.screenSize.y);

        const lerpFraction = world.accumMs/conf.UPDATE_MS;
        const lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);

        this.camera.update(lerpPos.x, lerpPos.y, this.screenSize.x, this.screenSize.y);

        let shipRadius = conf.PLAYER_RADIUS / assets.shipPixelRatio;

        // Draw normals to offscreen texture
        this.gl.clearColor(0.0, 0.0, 1.0, 0.0);
        this.renderer.setAndClearTarget(this.normalTex);
        this.renderer.drawTexture(lerpPos.x - shipRadius, lerpPos.y - shipRadius, shipRadius * 2, shipRadius * 2, this.shipNormalTex);
        this.renderer.render(this.camera);

        // Draw albedo to offscreen texture
        this.gl.clearColor(0, 0, 0, 1.0);
        this.renderer.setAndClearTarget(this.albedoTex);
        this.renderer.drawTexture(lerpPos.x - shipRadius, lerpPos.y - shipRadius, shipRadius * 2, shipRadius * 2, this.shipAlbedoTex);
        this.renderer.render(this.camera);

        let lightsMesh = new Mesh(VertAttrib.POS_BIT);
        const lightRadius = 150;
        lightsMesh.addCircle(0, 0, lightRadius);

        let lightPosData = [];
        for (let laser of world.laserList) {
            lightPosData.push(laser.line.end.x, laser.line.end.y);
        }

        let lightPosAttrib = new VertAttrib(ATTRIB_LIGHT_POS_LOC, 2, this.gl.FLOAT, 1);
        lightPosAttrib.data = lightPosData;

        this.lightsShader.setUniform("uScreenSize", [this.screenSize.x, this.screenSize.y]);
        this.lightsShader.setUniform("uRadius", lightRadius);

        let lightsModel = new Model(
            this.gl,
            lightsMesh,
            this.gl.TRIANGLES,
            this.lightsShader,
            [this.normalTex],
            [lightPosAttrib],
            lightPosData.length/2,
        );
        this.renderer.drawModel(lightsModel);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.DST_ALPHA); // combine lights equally
        this.gl.clearColor(0, 0, 0, 1.0);
        this.renderer.setAndClearTarget(this.highlightTex);
        this.renderer.render(this.camera);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        

        // this.renderer.drawTexture(0, 0, this.screenSize.x, this.screenSize.y, this.albedoTex);
        // this.renderer.setAndClearTarget(null);
        // this.renderer.render(this.uiCamera);



        let screenMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_BIT);
        screenMesh.addRect(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        let spriteModel = new Model(
            this.gl,
            screenMesh,
            this.gl.TRIANGLES,
            this.spriteShader,
            [this.albedoTex, this.highlightTex]
        );
        this.renderer.drawModel(spriteModel);
        this.renderer.setAndClearTarget(this.finalTex);
        this.renderer.render(this.uiCamera);

        let screenModel = new Model(
            this.gl,
            screenMesh,
            this.gl.TRIANGLES,
            this.gammaShader,
            [this.finalTex]
        );
        this.renderer.drawModel(screenModel);
        this.renderer.setAndClearTarget(null);

        this.renderer.render(this.uiCamera);

        if (world.map !== null) {
            this.drawLevel(world.map.rows);
        }
        this.renderer.setColor(0, 1, 0);
        this.renderer.drawCircleLine(world.player.lastAckedPos.x, world.player.lastAckedPos.y, conf.PLAYER_RADIUS);
        this.renderer.setColor(0, 0, 1);
        this.renderer.drawCircleLine(world.player.correctedPos.x, world.player.correctedPos.y, conf.PLAYER_RADIUS);

        this.renderer.setColor(1, 0, 0);
        for (let laser of world.laserList) {
            this.renderer.drawLine(laser.line.start, laser.line.end, 3);
        }
        this.renderer.render(this.camera);







        // let lerpFraction = world.accumMs/conf.UPDATE_MS;
        // let lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);
        // this.renderer.setColor(0.4, 0.8, 0.4);
        // this.renderer.drawCircle(lerpPos.x, lerpPos.y, conf.PLAYER_RADIUS);
        // this.renderer.setColor(0, 1, 0);
        // this.renderer.drawCircleLine(world.player.lastAckedPos.x, world.player.lastAckedPos.y, conf.PLAYER_RADIUS);
        // this.renderer.setColor(0, 0, 1);
        // this.renderer.drawCircleLine(world.player.correctedPos.x, world.player.correctedPos.y, conf.PLAYER_RADIUS);
        
        // this.camera.update(lerpPos.x, lerpPos.y, this.screenSize.x, this.screenSize.y);
    
        // for (let other of world.otherPlayers) {
        //     let lerpPos = lerpVec(other.prevPos, other.pos, lerpFraction);
        //     this.renderer.setColor(0.8, 0.4, 0.4);
        //     this.renderer.drawCircle(lerpPos.x, lerpPos.y, conf.PLAYER_RADIUS);
        //     this.renderer.setColor(0, 0, 1);
        //     this.renderer.drawCircle(other.lastAckedPos.x, other.lastAckedPos.y, conf.PLAYER_RADIUS);
        // }

        // this.renderer.setColor(1, 0, 0);
        // for (let laser of world.laserList) {
        //     this.renderer.drawLine(laser.line.start, laser.line.end, 3);
        // }

        // this.renderer.render(this.camera);

        // // Draw UI
        // this.uiCamera.update(0, 0, this.screenSize.x, this.screenSize.y);
        // let border = 10;
        // let barWidth = 80;
        // let barHeight = 10;
        // let ratio = world.player.energy / conf.PLAYER_ENERGY;
        // this.renderer.setColor(0.8, 0.1, 0.1);
        // this.renderer.drawRect(-barWidth/2, -this.screenSize.y/2 + border, barWidth, barHeight);
        // this.renderer.setColor(0.8, 0.8, 0);
        // this.renderer.drawRect(-barWidth/2, -this.screenSize.y/2 + border, barWidth * ratio, barHeight);

        // this.renderer.render(this.uiCamera);
    }
}

export {Graphics};