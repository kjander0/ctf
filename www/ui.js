import { Texture } from "./gfx/texture.js";
import { Vec } from "./math.js";

class UIFrame {
    static ALIGN_LEFT = 0;
    static ALIGN_RIGHT = 1;
    static ALIGN_TOP = 0;
    static ALIGN_BOTTOM = 1;
    static ALIGN_CENTRE = 3;

    pos = new Vec();
    size = new Vec();
    padding = 10;
    children = [];
    horizontalAlign = UIFrame.ALIGN_LEFT;
    verticalAlign = UIFrame.ALIGN_TOP;

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
        // Calculate size of each row, and size of content
        let rowList = [];
        let row = [];
        let rowWidth = 0;
        let rowHeight = 0;
        let contentSize = new Vec();
        let childIndex = 0;
        while (childIndex < this.children.length) {
            const child = this.children[childIndex];
            child.layOut();

            let doAddRow = false;
            if (row.length === 0 || rowWidth + this.padding + child.size.x <= this.size.x) {
                if (row.length > 0) {
                    rowWidth += this.padding;
                }
                rowWidth += child.size.x;
                rowHeight = Math.max(rowHeight, child.size.y);
                row.push(child);
                childIndex++;
            } else {
                doAddRow = true;
            }

            if (doAddRow || childIndex === this.children.length) {
                contentSize.x = Math.max(contentSize.x, rowWidth);
                if (rowList.length > 0) {
                    contentSize.y += this.padding;
                }
                contentSize.y += rowHeight;
                rowList.push([row, rowWidth, rowHeight]);
                row = [];
                rowWidth = 0;
                rowHeight = 0;
            }
        }

        // Align content region
        let contentPos = new Vec(this.pos);
        if (this.horizontalAlign === UIFrame.ALIGN_RIGHT) {
            contentPos = contentPos.addXY(this.size.x - contentSize.x, 0);
        } else if (this.horizontalAlign === UIFrame.ALIGN_CENTRE) {
            contentPos = contentPos.addXY((this.size.x - contentSize.x)/2, 0);
        }
        if (this.verticalAlign === UIFrame.ALIGN_TOP) {
            contentPos = contentPos.addXY(0, this.size.y - contentSize.y);
        } else if (this.verticalAlign === UIFrame.ALIGN_CENTRE) {
            contentPos = contentPos.addXY(0, (this.size.y - contentSize.y)/2);
        }

        // Position children
        let offset = new Vec(contentPos.x, contentPos.y + contentSize.y);
        for (let [row, rowWidth, rowHeight] of rowList) {
            offset.x = contentPos.x + (contentSize.x - rowWidth) / 2;
            offset.y -= rowHeight;
            for (let child of row) {
                child.pos.set(offset);
                child.layOut();
                offset.x += child.size.x + this.padding;
            }
            offset.y -= this.padding;
        }
    }
}

class UIButton {
    pos = new Vec();
    size = new Vec();
    padding = 10;
    content;
    userdata = null;

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