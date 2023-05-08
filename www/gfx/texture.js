import {gl} from "./gl.js";

class Texture {
    glTexture;
    s0 = 0;
    s1 = 1;
    t0 = 0;
    t1 = 1;

    width;
    height;

    // Offset from original source image (e.g. because texture packer trimmed)
    srcOffsetX = 0;
    srcOffsetY = 0;

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

    subTexture(x, y, width, height) {
        NEED TO USE TEXTURE ARRAY TO PREVENT BLEEDING
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
        gl.deleteTexture(glTexture);
    }
}

export {Texture};