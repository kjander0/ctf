import {Texture} from "./texture.js";
import { Vec } from "../math.js";

// Contains information for rendering glyphs of bitmap font.
// Bitmap and csv file come from 'Codehead Bitmap Font Generator' 
class Font {
    // each glyph is a drawRect
    // just 
    texture;

    cellWidth;
    cellHeight;
    asciiCharStart;
    fontHeight;

    glyphs = new Array(256);

    constructor(texture, csvText) {
        this.texture = texture;
        this._parseCSV(csvText);
    }

    calcBounds(text, height) {
        const scale = height / this.fontHeight;
        const size = new Vec(0, height);
        for (let i = 0; i < text.length; i++) {
            const asciiCode = text.charCodeAt(i);
            const glyph = this.glyphs[asciiCode];
            size.x += scale * glyph.width;
        }
        return size;
    }

    _parseCSV(text) {
        let imgWidth, imgHeight;
        let cellsPerRow;
        for (let line of text.split('\n')) {
            const [left, right] = line.split(',');
            
            if (left.includes("Image Width")) {
                imgWidth = Number(right);
            }
            if (left.includes("Image Height")) {
                imgHeight = Number(right);
            }

            if (left.includes("Cell Width")) {
                this.cellWidth = Number(right);
                cellsPerRow = Math.floor(imgWidth / this.cellWidth);
            }
            if (left.includes("Cell Height")) {
                this.cellHeight = Number(right);
            }


            if (left.includes("Start Char")) {
                this.asciiCharStart = Number(right);
            }
            if (left.includes("Font Height")) {
                this.fontHeight = Number(right);
            }

            if (left.includes("Base Width")) {
                const charIndex = Number(left.split(' ')[1]);
                const baseWidth = Number(right);
                const row = Math.floor((charIndex - this.asciiCharStart) / cellsPerRow);
                const col = Math.floor((charIndex - this.asciiCharStart) - row * cellsPerRow);
                const glyph = new Glyph();
                glyph.width  = baseWidth;
                const sd = this.texture.s1 - this.texture.s0;
                const td = this.texture.t1 - this.texture.t0;
                glyph.s0 = this.texture.s0 + col * this.cellWidth / this.texture.width * sd;
                glyph.s1 = this.texture.s0 + (col+1) * this.cellWidth / this.texture.width * sd;
                glyph.t1 = this.texture.t0 + row * this.cellHeight / this.texture.height * td;
                glyph.t0 = this.texture.t0 + (row+1) * this.cellHeight / this.texture.height * td;
                this.glyphs[charIndex] = glyph;
            }
        }
    }
}

class Glyph {
    width;
    s0;
    s1;
    t0;
    t1;
}

export {Font};