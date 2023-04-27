import { Texture } from "./gfx/texture.js";
import { Vec } from "./math.js";

class UIFrame {
    pos = new Vec();
    size = new Vec();
    padding = 10;
    children = [];

    constructor(pos, size) {
        this.pos.set(pos);
        this.size.set(size);
    }

    addChild(child) {
        this.children.push(child);
    }

    onmousedown(x, y) {
        for (let child of this.children) {
            if (!(child instanceof UIButton)) {
                continue
            }
            if (x > child.pos.x && x < child.pos.x + child.size.x) {
                if (y > child.pos.y && y < child.pos.y + child.size.y) {
                    child.onmousedown(x, y);
                    return true;
                }
            }
        }
        return false;
    }

    layOut() {
        let rowList = [];
        let row = [];
        let rowWidth = 0;
        let rowHeight = 0;
        for (let child of this.children) {
            child.layOut();
            if (rowWidth > 0 && rowWidth + child.size.x > this.size.x) {
                rowList.push([row, rowWidth, rowHeight]);
                row = [];
                rowWidth = 0;
            }
            if (row.length > 0) {
                rowWidth += this.padding;
            }
            rowHeight = Math.max(rowHeight, child.size.y);
            row.push(child);
            rowWidth += child.size.x;
        }
        if (row.length > 0) {
            rowList.push([row, rowWidth, rowHeight]);
        }

        let contentHeight = 0;
        for (let row of rowList) {
            contentHeight += row[2];
        }

        let offset = new Vec(this.pos.x, this.pos.y + this.size.y - (this.size.y - contentHeight)/2);
        for (let [row, rowWidth, rowHeight] of rowList) {
            offset.x = (this.size.x - rowWidth) / 2;
            for (let child of row) {
                child.pos.set(offset.x, offset.y);
                child.layOut();
                offset.x += child.size.x + this.padding;
            }
            offset.y -= rowHeight + this.padding;
        }
    }
}

class UIButton {
    pos = new Vec();
    size = new Vec();
    padding = 10;
    content;
    usserdata = null;

    constructor(content) {
        this.content = content;
    }

    onmousedown(x, y) {
        throw "not implemented";
    }

    layOut() {
        this.content.layOut();
        this.content.pos.set(this.pos.addXY(this.padding, this.padding));
        this.size.set(this.content.size.x + this.padding * 2, this.content.size.y + this.padding * 2);
    }
}

class UIText {
    text;
    font;
    height;
    pos = new Vec();
    size = new Vec();
    constructor(text, font) {
        this.text = text;
        this.font = font;
        this.height = this.font.fontHeight;
    }

    layOut() {
        this.size.set(this.font.calcBounds(this.text, this.height));
    }
}

class UIImage {
    texture;
    pos = new Vec();
    size = new Vec();

    constructor(texture, size) {
        this.texture = texture;
        this.size.set(size);
    }

    layOut() {

    }
}

export {UIFrame, UIButton, UIImage, UIText};