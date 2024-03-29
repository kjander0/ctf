import { VertAttrib, Mesh, Model } from "./mesh.js";
import { Texture, TextureArray } from "./texture.js";
import { Transform, Vec } from "../math.js";
import * as assets from "../assets.js";
import { gl } from "./gl.js";

class Renderer {
    bufferSize = new Vec();
    shapeMesh;
    texMeshMap = new Map();
    models = [];

    constructor() {    
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
    
    drawTexture(x, y, width, height, texture) {
        console.assert(texture instanceof Texture, "bad texture");

        let texMesh = this.texMeshMap.get(texture);
        if (texMesh === undefined) {
            if (texture.parent instanceof TextureArray) {
                texMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_3D_BIT);
            } else {
                texMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_BIT);
            }
            this.texMeshMap.set(texture, texMesh);
        }
        texMesh.addRect(x, y, width, height, texture.s0, texture.t0, texture.s1, texture.t1, texture.layer);
    }

    drawText(text, x, y, font, height=24) {
        let texMesh = this.texMeshMap.get(font.texture);
        if (texMesh === undefined) {
            texMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_BIT);
            this.texMeshMap.set(font.texture, texMesh);
        }
        const scale = height / font.fontHeight;
        let xOffset = x;
        for (let i = 0; i < text.length; i++) {
            const asciiCode = text.charCodeAt(i);
            const glyph = font.glyphs[asciiCode];
            texMesh.addRect(xOffset, y, scale * font.cellWidth, height, glyph.s0, glyph.t0, glyph.s1, glyph.t1);
            xOffset += scale * glyph.width;
        }
    }
    
    drawModel(model) {
        this.models.push(model);
    }

    setAndClearTarget(targetTexture=null) {
        if (targetTexture !== null) {
            targetTexture.setAsTarget();
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    render(camera) {
        const disposeList = [];

        const shapeModel = new Model(gl, this.shapeMesh, gl.TRIANGLES, assets.shapeShader);
        this.models.push(shapeModel);
        disposeList.push(shapeModel);
        this.shapeMesh.clear();
    
        this.texMeshMap.forEach((mesh, texture) => {
            let shader;
            if (texture.parent instanceof TextureArray) {
                shader = assets.texArrayShader;
            } else {
                shader = assets.texShader;
            }
            const texModel = new Model(gl, mesh, gl.TRIANGLES, shader, [texture]);
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
    }
    
    _renderModel(model, camera) {
        if (model.numVertices === 0) {
            return;
        }
    
        model.shader.use();
    
        model.shader.setUniform("uProjMatrix", camera.projMatrix);
        model.shader.setUniform("uCamMatrix", camera.invTransform.mat);
    
        if (model.hasAttrib(VertAttrib.TEX_BIT) && model.textures.length ===0) {
            throw "missing textures for model with tex coord attribs";
        }

        for (let i = 0; i < model.textures.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            model.shader.setUniformi("uTex"+i, i);
            let tex = model.textures[i];
            if (tex.parent instanceof TextureArray) {
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex.glTexture);
            } else {
                gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
            }
        }
        gl.bindVertexArray(model.vao);
        gl.drawArraysInstanced(model.drawMode, 0, model.numVertices, model.numInstances);
    }
}

export {Renderer};

