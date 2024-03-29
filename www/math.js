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

    static fromAngleRads(angleRads) {
        return new Vec(Math.cos(angleRads), Math.sin(angleRads));
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

    setLength(l) {
        let scale = l / this.length();
        this.x *= scale;
        this.y *= scale;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    sqrLength() {
        return this.x * this.x + this.y * this.y;
    }

    normalize() {
        return this.scale(1/this.length());
    }

    resize(size) {
        return this.scale(size / this.length());
    }

    scale(s) {
        return new Vec(this.x * s, this.y * s);
    }

    distanceTo(v) {
        return this.sub(v).length();
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    cross(v) {
        return this.x*v.y - this.y*v.x;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    reflect(normal) {
        return this.sub(normal.scale(2.0 * this.dot(normal)));
    }
}

class Transform {
    mat = new Float32Array(9);

    constructor() {
        this.identity();
    }

    identity() {
        this.mat[0] = 1; this.mat[3] = 0; this.mat[6] = 0;
        this.mat[1] = 0; this.mat[4] = 1; this.mat[7] = 0;
        this.mat[2] = 0; this.mat[5] = 0; this.mat[8] = 1;
    }

    mul(x, y) {
        if (x instanceof Vec) {
            y = x.y;
            x = x.x;
        }
        let newX = x * this.mat[0] + y * this.mat[3] + this.mat[6];
        let newY = x * this.mat[1] + y * this.mat[4] + this.mat[7];
        return new Vec(newX, newY);
    }

    // result = this * other
    combine(other) {
        let c = new Transform();
        c.mat[0] = this.mat[0] * other.mat[0] + this.mat[3] * other.mat[1] + this.mat[6] * other.mat[2];
        c.mat[1] = this.mat[1] * other.mat[0] + this.mat[4] * other.mat[1] + this.mat[7] * other.mat[2];
        c.mat[2] = this.mat[2] * other.mat[0] + this.mat[5] * other.mat[1] + this.mat[8] * other.mat[2];

        c.mat[3] = this.mat[0] * other.mat[3] + this.mat[3] * other.mat[4] + this.mat[6] * other.mat[5];
        c.mat[4] = this.mat[1] * other.mat[3] + this.mat[4] * other.mat[4] + this.mat[7] * other.mat[5];
        c.mat[5] = this.mat[2] * other.mat[3] + this.mat[5] * other.mat[4] + this.mat[8] * other.mat[5];

        c.mat[6] = this.mat[0] * other.mat[6] + this.mat[3] * other.mat[7] + this.mat[6] * other.mat[8];
        c.mat[7] = this.mat[1] * other.mat[6] + this.mat[4] * other.mat[7] + this.mat[7] * other.mat[8];
        c.mat[8] = this.mat[2] * other.mat[6] + this.mat[5] * other.mat[7] + this.mat[8] * other.mat[8];
        return c;
    }

    getTranslation() {
        return new Vec(
            this.mat[6],
            this.mat[7],
        );
    }

    setTranslation(x, y) {
        if (x instanceof Vec) {
            y = x.y;
            x = x.x;
        }
        this.mat[6] = x;
        this.mat[7] = y;
        return this;
    }

    /** Limited to orthogonal matrix with scaling */
	affineInverse() {
		var rotCol0 = new Vec(this.mat[0], this.mat[1]);
        var rotCol1 = new Vec(this.mat[3], this.mat[4]);
        rotCol0.setLength(1 / rotCol0.length());
        rotCol1.setLength(1 / rotCol1.length());
        
        let inverse = new Transform();
         // transposed columns
        inverse.mat[0] = rotCol0.x; inverse.mat[3] = rotCol0.y;
        inverse.mat[1] = rotCol1.x; inverse.mat[4] = rotCol1.y;

		var invTrans = inverse.mul(this.getTranslation()).scale(-1);
		inverse.setTranslation(invTrans);		
		return inverse;
	}

    static translation(x, y) {
        let t = new Transform();
        t.mat[6] = x;
        t.mat[7] = y;
        return t;
    }

    static rotation(rads) {
        const t = new Transform();
        const C = Math.cos(rads);
        const S = Math.sin(rads);
        t.mat[0] = C; t.mat[3] = -S;
        t.mat[1] = S; t.mat[4] = C;
        return t;
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

    closestSide(pos) {
        let closestDist = this.topLine().closestPoint(pos).distanceTo(pos);
        let closestLine = this.topLine();
    
        let candidateDist = this.bottomLine().closestPoint(pos).distanceTo(pos);
        if (candidateDist < closestDist) {
            closestDist = candidateDist;
            closestLine = this.bottomLine();
        }
    
        candidateDist = this.leftLine().closestPoint(pos).distanceTo(pos);
        if (candidateDist < closestDist) {
            closestDist = candidateDist;
            closestLine = this.leftLine();
        }
    
        candidateDist = this.rightLine().closestPoint(pos).distanceTo(pos);
        if (candidateDist < closestDist) {
            closestDist = candidateDist;
            closestLine = this.rightLine();
        }
        return closestLine;
    }

    midpoint() {
        return this.pos.add(this.size.scale(0.5))
    }
    
    topLine() {
        return new Line(this.pos.addXY(0, this.size.y), this.pos.add(this.size));
    }

    bottomLine() {
        return new Line(this.pos, this.pos.addXY(this.size.x, 0));
    }

    leftLine() {
        return new Line(this.pos, this.pos.addXY(0, this.size.y));
    }

    rightLine() {
        return new Line(this.pos.addXY(this.size.x, 0), this.pos.add(this.size));
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

    intersection(other) {
        let u = this.end.sub(this.start);
        let v = other.end.sub(other.start);
    
        let vCrossU = v.cross(u);
        if (compareFloat(vCrossU, 0, 1e-6)) { // Lines parallel
            if (compareFloat(this.start.sub(other.start).cross(v), 0, 1e-6)) { // Collinear
                let vLenSquared = v.dot(v);
                let t0 = this.start.sub(other.start).dot(v) / vLenSquared;
                let t1 = this.end.sub(other.start).dot(v) / vLenSquared;
                if (t0 > t1) {
                    t0, t1 = t1, t0;
                }
                if (t0 >= 0 && t0 <= 1 || t1 >= 0 && t1 <= 1 || t0 <= 0 && t1 >= 1) {
                    // return middle of overlap
                    let intersectT = (Math.max(0, t0) + Math.min(1, t1)) / 2;
                    return other.start.add(v.scale(intersectT));
                }
            }
            return null;
        }
    
        let s = this.start.sub(other.start).cross(v) / vCrossU;
        let t = this.start.sub(other.start).cross(u) / vCrossU;
    
        if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
            return this.start.add(u.scale(s));
        }
        return null
    }

    length() {
        return this.end.sub(this.start).length();
    }
}

function compareFloat(a, b, eps) {
    return Math.abs(a - b) < eps;
}

export {Vec, Rect, Circle, Line, Transform, compareFloat};