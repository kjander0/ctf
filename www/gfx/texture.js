import {gl} from "./gl.js";

class Texture {
    parentTexture = null; // Another Texture or a TextureArray
    glTexture = null;
    fbo = null;
    layer; // layer of parent TextureArray
    s0 = 0;
    s1 = 1;
    t0 = 0;
    t1 = 1;

    width;
    height;

    static fromSize(width, height, srgb=false) {
        let tex = new Texture();
        tex.width = width;
        tex.height = height;
        tex.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
        let internalFormat = gl.RGBA;
        if (srgb) {
            internalFormat = gl.SRGB8_ALPHA8;
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, tex.width, tex.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    static fromImage(image, srgb=false) {
        let tex = new Texture();
        tex.width = image.naturalWidth;
        tex.height = image.naturalHeight;
        tex.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
    
        const level = 0;
        let internalFormat = gl.RGBA;
        if (srgb) {
            internalFormat = gl.SRGB8_ALPHA8;
        }
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
    
        gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat,
            srcType,
            image
        );
    
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);	
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        return tex;
    }

    setAsTarget() {
        console.assert(this.parentTexture === null);

        if (this.fbo === null) {
            this.fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.glTexture, 0);
            console.assert(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE);
            return;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    }

    subTexture(x, y, width, height) {
        const sub = new Texture();
        sub.glTexture = this.glTexture;
        sub.width = width;
        sub.height = height;
        sub.s0 = (x+0.5) / this.width;
        sub.s1 = (x + width-0.5) / this.width;
        sub.t0 = (y+0.5) / this.height;
        sub.t1 = (y + height-0.5) / this.height;
        return sub;
    }

    dispose() {
        if (this.parentTexture === null) {
            gl.deleteTexture(glTexture);
        }
        if (this.fbo === null) {
            gl.deleteFrameBuffer(this.fbo);
        }
    }
}

class TextureArray {
    glTexture;
    width;
    height;
    texMap = {};

    static async load(image, infoJsonText, srgb=false) {
        const newTexArray = new TextureArray();
        const atlasInfo = JSON.parse(infoJsonText);

        // Find max size sprite in atlas
        newTexArray.width = 0;
        newTexArray.height = 0;
        let numLayers = 0;
        for (let [_, info] of Object.entries(atlasInfo.frames)) {
            newTexArray.width = Math.max(newTexArray.width, info.frame.w);
            newTexArray.height = Math.max(newTexArray.height, info.frame.h);
            numLayers++;
        }

        // Allocate gl texture array
        newTexArray.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, newTexArray.glTexture);
        let internalFormat = gl.RGBA8;
        if (srgb) {
            internalFormat = gl.SRGB8_ALPHA8;
        }
        const numMipMapLevels = 4;
        gl.texStorage3D(gl.TEXTURE_2D_ARRAY, numMipMapLevels, internalFormat, newTexArray.width, newTexArray.height, numLayers)

        // Move each sprite into texture array
        const clearData = new Uint8Array(newTexArray.width * newTexArray.height * 4);
        for (let i = 0; i < clearData.length; i++) {
            clearData[i] = 0;
        }
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const mipLevel = 0;
        let zOffset = 0;

        for (let [name, info] of Object.entries(atlasInfo.frames)) {
            const subImage = await createImageBitmap(image, info.frame.x, info.frame.y, info.frame.w, info.frame.h);

            // Clear to transparent
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, mipLevel, 0, 0, zOffset, newTexArray.width, newTexArray.height, 1, srcFormat, srcType, clearData);
            
            // Write sprite data
            const xOffset = info.spriteSourceSize.x;
            const yOffset = info.spriteSourceSize.y;
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, mipLevel, xOffset, yOffset, zOffset, subImage.width, subImage.height, 1, srcFormat, srcType, subImage)

            const subTex = new Texture();
            subTex.glTexture = newTexArray.glTexture;
            subTex.parent = newTexArray;
            subTex.layer = zOffset;
            subTex.width = newTexArray.width;
            subTex.height = newTexArray.height;
            subTex.s1 = (info.sourceSize.w-0.5) / newTexArray.width;
            subTex.t1 = (info.sourceSize.h-0.5) / newTexArray.height;
            newTexArray.texMap[name] = subTex;
            zOffset++;
        }

        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);	
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return newTexArray;
    }

    getTexture(name) {
        const tex = this.texMap[name];
        console.assert(tex !== undefined, "no element for name: " + tex);
        return tex;
    }

    dispose() {
        gl.deleteTexture(glTexture);
    }
}

export {Texture, TextureArray};