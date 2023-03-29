import { checkError } from "./error.js";
import { VertAttrib, Mesh, Model } from "./mesh.js";
import { Shader } from "./shader.js";
import { Transform, Vec } from "../math.js";
import * as assets from "../assets.js";

class Renderer {
    gl;
    fbo;
    
    transformStack = [new Transform()];
    bufferSize = new Vec();
    shapeMesh;
    texMeshMap = new Map();
    models = [];
    shapeShader;
    texShader;

    constructor(gl) {
        this.gl = gl;

        this.fbo = this.gl.createFramebuffer();

        this.shapeShader = new Shader(this.gl, assets.shapeVertSrc, assets.shapeFragSrc);
        this.texShader = new Shader(this.gl, assets.texVertSrc, assets.texFragSrc);
    
        this.shapeMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.COLOR_BIT);
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

    drawTriangle(p0, p1, p2) {
        this.shapeMesh.setTransform(this.transformStack[this.transformStack.length-1]);
        this.shapeMesh.add(p0.x, p0.y);
        this.shapeMesh.add(p1.x, p1.y);
        this.shapeMesh.add(p2.x, p2.y);
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
            texMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_BIT);
            this.texMeshMap.set(texture, texMesh);
        }
        texMesh.setTransform(this.transformStack[this.transformStack.length-1]);
        texMesh.addRect(x, y, width, height);
    }
    
    drawModel(model) {
        this.models.push(model);
    }

    setAndClearTarget(targetTexture=null) {
        if (targetTexture !== null) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, targetTexture.glTexture, 0);
            console.assert(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    render(camera) {
        const disposeList = [];

        const shapeModel = new Model(this.gl, this.shapeMesh, this.gl.TRIANGLES, this.shapeShader);
        this.models.push(shapeModel);
        disposeList.push(shapeModel);
        this.shapeMesh.clear();
    
        this.texMeshMap.forEach((mesh, texture) => {
            const texModel = new Model(this.gl, mesh, this.gl.TRIANGLES, this.texShader, [texture]);
            this.models.push(texModel);
            disposeList.push(texModel);
            mesh.clear();
        });

        for (let model of this.models) {
            this._renderModel(model, camera);
        }

        // TODO: reuse vao/vbo instead of disposing every frame
        for (let model of disposeList) {
            model.dispose();
        }

        this.models = [];

        checkError(this.gl);
    }
    
    _renderModel(model, camera) {
        if (model.numVertices === 0) {
            return;
        }
    
        model.shader.use();

        // TODO: move projection into camera matrix so we only need one
        const scaleX = 2 / this.gl.drawingBufferWidth;
        const scaleY = 2 / this.gl.drawingBufferHeight;
        const projMatrix = [
            scaleX, 0, 0, 0,
            0, scaleY, 0, 0,
            0, 0, -1, 0,
            -1, -1, 0, 1,
          ];
    
        model.shader.setUniform("uProjMatrix", projMatrix);
        model.shader.setUniform("uCamMatrix", camera.invTransform.mat);
    
        if (model.hasAttrib(VertAttrib.TEX_BIT) && model.textures.length ===0) {
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
}

export {Renderer};

