class Vec {
    constructor(x=0, y=0) {
        if (x instanceof Vec) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    set(x, y) {
        if (x instanceof Vec) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    add(other) {
        return new Vec(this.x + other.x, this.y + other.y);
    }

    addXY(x, y) {
        return new Vec(this.x +x, this.y + y);
    }

    subXY(x, y) {
        return new Vec(this.x - x, this.y - y);
    }

    sub(other) {
        return new Vec(this.x - other.x, this.y - other.y);
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    resize(size) {
        return this.scale(size / this.length());
    }

    scale(s) {
        return new Vec(this.x * s, this.y * s);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
}

class Rect {
    constructor(pos, size) {
        this.pos = new Vec(pos);
        this.size = new Vec(size);
    }

    overlaps(r2) {
        let r1 = this;
        let r1Max = r1.pos.add(r1.size);
        let r2Max = r2.pos.add(r2.size);
        if (r1Max.x > r2.pos.x && r1.pos.x < r2Max.x) {
            if (r1Max.y > r2.pos.y && r1.pos.y < r2Max.y) {
                return true;
            }
        }
        return false;
    }

    containsPoint(p) {
        return p.x > this.pos.x && p.x < this.pos.x+this.size.x && p.y > this.pos.y && p.y < this.pos.y+this.size.y;
    }
}

class Circle {
    constructor(pos, radius) {
        this.pos = new Vec(pos);
        this.radius = radius;
    }
}

class Line {
    constructor(start, end) {
        this.start = new Vec(start);
        this.end = new Vec(end);
    }

    closestPoint(p) {
        let u = this.end.sub(this.start);
        let v = p.sub(this.start);

        let uLen = u.length();
        let sLen = v.dot(u) / uLen;

        if (sLen < 0) {
            return new Vec(this.start);
        } else if (sLen > uLen) {
            return new Vec(this.end);
        }

        let s = u.resize(sLen);
        return this.start.add(s);
    }

    length() {
        return this.end.sub(this.start).length();
    }
}

export {Vec, Rect, Circle, Line};