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

    constructor(bitmap, csvText) {
        this.texture = Texture.fromImage(bitmap)
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
                glyph.s0 = col * this.cellWidth / imgWidth;
                glyph.s1 = (col+1) * this.cellWidth / imgWidth;
                glyph.t1 = row * this.cellHeight / imgHeight;
                glyph.t0 = (row+1) * this.cellHeight / imgHeight;
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