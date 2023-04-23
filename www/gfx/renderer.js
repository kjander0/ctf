import { checkError } from "./error.js";
import { VertAttrib, Mesh, Model } from "./mesh.js";
import { Transform, Vec } from "../math.js";
import * as assets from "../assets.js";

class Renderer {
    gl;
    fbo;
    
    bufferSize = new Vec();
    shapeMesh;
    texMeshMap = new Map();
    models = [];

    constructor(gl) {
        this.gl = gl;

        this.fbo = this.gl.createFramebuffer();
    
        this.shapeMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.COLOR_BIT);
    }
    
    setColor (r, g, b, a=1) {
        this.shapeMesh.setColor(r, g, b, a);
    }
    
    drawRect(x, y, width, height) {
        this.shapeMesh.addRect(x, y, width, height);
    }

    drawRectLine(x, y, width, height, lineWidth=1) {
        this.shapeMesh.addRect(x, y, width, lineWidth);
        this.shapeMesh.addRect(x, y, lineWidth, height);
        this.shapeMesh.addRect(x + width, y, lineWidth, height);
        this.shapeMesh.addRect(x, y+height, width, lineWidth);
    }

    drawTriangle(p0, p1, p2) {
        this.shapeMesh.add(p0.x, p0.y);
        this.shapeMesh.add(p1.x, p1.y);
        this.shapeMesh.add(p2.x, p2.y);
    }
    
    drawCircle(x, y, radius) {
        this.shapeMesh.addCircle(x, y, radius);
    }
    
    drawCircleLine(x, y, radius, width=1) {
        this.shapeMesh.addCircleLine(x, y, radius, width);
    }
    
    drawLine(start, end, width=1) {
        this.shapeMesh.addLine(start, end, width);    
    }
    
    drawTexture(x, y, width, height, texture, ccwOrientation=0) {
        let texMesh = this.texMeshMap.get(texture);
        if (texMesh === undefined) {
            texMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_BIT);
            this.texMeshMap.set(texture, texMesh);
        }

        const s0=0, t0=1, s1=1, t1=0;
        if (ccwOrientation === 0) {
            texMesh.add(x, y, s0, t0);
            texMesh.add(x+width, y, s1, t0);
            texMesh.add(x+width, y+height, s1, t1);
            texMesh.add(x, y, s0, t0);
            texMesh.add(x+width, y+height, s1, t1);
            texMesh.add(x, y+height, s0, t1);
        } else if (ccwOrientation === 1) {
            texMesh.add(x, y, s0, t1);
            texMesh.add(x+width, y, s0, t0);
            texMesh.add(x+width, y+height, s1, t0);
            texMesh.add(x, y, s1, t1);
            texMesh.add(x+width, y+height, s0, t0);
            texMesh.add(x, y+height, s1, t1);
        } else if (ccwOrientation === 2) {

        } else if (ccwOrientation === 3) {

        }
    }

    drawText(text, x, y, font, height=20) {
        let texMesh = this.texMeshMap.get(font.texture);
        if (texMesh === undefined) {
            texMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_BIT);
            this.texMeshMap.set(font.texture, texMesh);
        }

        let xOffset = x;
        for (let i = 0; i < text.length; i++) {
            const asciiCode = text.charCodeAt(i);
            const glyph = font.glyphs[asciiCode];
            texMesh.addRect(xOffset, y, font.cellWidth, font.fontHeight, glyph.s0, glyph.t0, glyph.s1, glyph.t1);
            //texMesh.addRect(0, 0, 100, 100, 0, 0, 0.2, 0.2);
            xOffset += glyph.width;
        }
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

        const shapeModel = new Model(this.gl, this.shapeMesh, this.gl.TRIANGLES, assets.shapeShader);
        this.models.push(shapeModel);
        disposeList.push(shapeModel);
        this.shapeMesh.clear();
    
        this.texMeshMap.forEach((mesh, texture) => {
            const texModel = new Model(this.gl, mesh, this.gl.TRIANGLES, assets.texShader, [texture]);
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

