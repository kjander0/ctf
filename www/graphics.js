import {lerpVec, extrapolateVec} from "./interpolate.js";
import { Vec } from "./math.js";
import {Map} from "./map.js";
import * as conf from "./conf.js";

const ATTRIB_POS = 1;
const ATTRIB_COLOR = 2;
const ATTRIB_TEX = 4;

const ATTRIB_POS_LOC = 0;
const ATTRIB_COLOR_LOC = 1;
const ATTRIB_TEX_LOC = 2;

class Sprite {
    albedoTex;
    normalTex;

    constructor(albedo, normal) {
        this.albedoTex = albedo;
        this.normalTex = normal;
    }
}

// TODO
// - pre-allocate STREAM vbo's for buffer streaming
class Graphics {
    camera = new gfx.Camera();
    uiCamera = new gfx.Camera();
    sprites = [];



    canvas;
    gl;
    resizeCb = function() {};
    transformStack = [new Transform()];
    bufferSize = new Vec();
    projMatrix;
    shapeMesh;
    texMeshMap = new Map();
    models = [];
    shapeShader;
    texShader;
    fbo;

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
    
        this.shapeShader = new Shader(assets.shapeVertSrc, assets.shapeFragSrc);
        this.texShader = new Shader(assets.texVertSrc, assets.texFragSrc);
    
        this.shapeMesh = new Mesh(ATTRIB_POS | ATTRIB_COLOR);
    
        const resizeObserver = new ResizeObserver(() => {
            _onresize();
        });
        resizeObserver.observe(this.canvas);
    
        _onresize(); // initial resize
    
        this.fbo = this.gl.createFramebuffer();
    }

    _onresize() {
        // TODO: throttle resize with timer!!!
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    
        this.bufferSize.set(this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    
        const scaleX = 2 / this.gl.drawingBufferWidth;
        const scaleY = 2 / this.gl.drawingBufferHeight;
    
        this.projMatrix = [
            scaleX, 0, 0, 0,
            0, scaleY, 0, 0,
            0, 0, -1, 0,
            -1, -1, 0, 1,
          ];
        
        this.resizeCb(this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    }
    
    setResizeCb(cb) {
        this.resizeCb = cb;
    }
    
    pushTransform(t) {
        this.transformStack.push(this.transformStack[this.transformStack.length-1].combine(t));
    }
    
    popTransform() {
        if (this.transformStack.length < 2) {
            return;
        }
        this.transformStack.pop();
    }
    
    getTransform() {
        return this.transformStack[this.transformStack.length-1];
    }
    
    setColor (r, g, b) {
        this.shapeMesh.setColor(r, g, b);
    }
    
    drawRect(x, y, width, height) {
        this.shapeMesh.setTransform(this.transformStack[this.transformStack.length-1]);
        this.shapeMesh.addRect(x, y, width, height);
    }
    
    drawCircle(x, y, radius) {
        this.shapeMesh.setTransform(this.transformStack[this.transformStack.length-1]);
        this.shapeMesh.addCircle(x, y, radius);
    }
    
    drawCircleLine(x, y, radius, width=1) {
        this.shapeMesh.setTransform(this.transformStack[this.transformStack.length-1]);
        this.shapeMesh.addCircleLine(x, y, radius, width);
    }
    
    drawLine(start, end, width=1) {
        this.shapeMesh.setTransform(this.transformStack[this.transformStack.length-1]);
        this.shapeMesh.addLine(start, end, width);    
    }
    
    drawTexture(x, y, width, height, texture) {
        let texMesh = this.texMeshMap.get(texture);
        if (texMesh === undefined) {
            texMesh = new Mesh(ATTRIB_POS | ATTRIB_TEX);
            this.texMeshMap.set(texture, texMesh);
        }
        texMesh.setTransform(this.transformStack[this.transformStack.length-1]);
        texMesh.addRect(x, y, width, height);
    }
    
    drawModel(model) {
        this.models.push(model);
    }
    
    render(camera, targetTexture=null) {
        if (targetTexture !== null) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, targetTexture.glTexture, 0);
            console.assert(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
        const disposeModels = [];
    
        const shapeModel = new Model(this.shapeMesh, gl.TRIANGLES, this.shapeShader);
        this.models.push(shapeModel);
        disposeModels.push(shapeModel);
        this.shapeMesh.clear();
    
        this.texMeshMap.forEach((mesh, texture) => {
            const texModel = new Model(mesh, this.gl.TRIANGLES, texShader, [texture]);
            this.models.push(texModel);
            disposeModels.push(texModel);
            mesh.clear();
        });
    
        for (let model of this.models) {
            this._renderModel(camera, model);
        }
        this.models = [];
        
        // TODO: reuse vao/vbo instead of disposing every frame
        for (let model of disposeModels) {
            model.dispose();
        }
    
        checkError();
    }
    
    _renderModel(camera, model) {
        if (model.numVertices === 0) {
            return;
        }
    
        model.shader.use();
    
        model.shader.setUniform("uProjMatrix", projMatrix);
        model.shader.setUniform("uCamMatrix", camera.invTransform.mat);
    
        if (model.hasAttrib(ATTRIB_TEX) && model.textures.length ===0) {
            throw "missing textures for model with tex coord attribs";
        }
    
        for (let i = 0; i < model.textures.length; i++) {
            let tex = model.textures[i];
            this.gl.activeTexture(this.gl.TEXTURE0 + i);
            this.gl.bindTexture(this.gl.TEXTURE_2D, tex.glTexture);
            model.shader.setUniformi("uTex"+i, i);
        }
    
        this.gl.bindVertexArray(model.vao);
    
        this.gl.drawArraysInstanced(model.drawMode, 0, model.numVertices, model.numInstances);
    }
    
    sizeOf(glType) {
        if (glType === this.gl.FLOAT) {
            return Float32Array.BYTES_PER_ELEMENT;
        }
        throw "length of type not specified";
    }
    
    checkError() {
        const err = this.gl.getError();
        if (err === this.gl.NO_ERROR) {
            return;
        } else if (err === this.gl.INVALID_ENUM) {
            throw "gl error: invalid enum";
        } else if (err === this.gl.INVALID_VALUE) {
            throw "gl error: invalid value";
        } else if (err === this.gl.INVALID_OPERATION) {
            throw "gl error: invalid operation";
        } else if (err === this.gl.INVALID_FRAMEBUFFER_OPERATION) {
            throw "gl error: invalid framebuffer operation";
        } else if (err === this.gl.OUT_OF_MEMORY) {
            throw "gl error: out of memory";
        } else if (err === this.gl.CONTEXT_LOST_WEBGL) {
            throw "gl error: context lost";
        }
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