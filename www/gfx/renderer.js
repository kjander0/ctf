import { checkError } from "error.js";

class ModelRenderer {
    gl;
    fbo;

    constructor(gl) {
        this.gl = gl;
    }

    renderModels(models, targetTexture=null) {
        if (targetTexture !== null) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, targetTexture.glTexture, 0);
            console.assert(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
    
        for (let model of models) {
            this._renderModel(model);
        }
    
        checkError();
    }
    
    _renderModel(model) {
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
        model.shader.setUniform("uCamMatrix", this.camera.invTransform.mat);
    
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
}

export {ModelRenderer};

