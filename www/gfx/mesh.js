import {Transform, Vec} from "../math.js";
import {Color} from "./color.js"

class VertAttrib {
    static POS_BIT = 1;
    static COLOR_BIT = 2;
    static TEX_BIT = 4;
    static TEX_3D_BIT = 8;

    static POS_LOC = 0;
    static COLOR_LOC = 1;
    static TEX_LOC = 2;
    static TEX_3D_LOC = 3;

    loc;
    size;
    type;
    divisor;
    data = null;

    constructor(loc, size, type, divisor=0) {
        this.loc = loc;
        this.size = size;
        this.type = type;
        this.divisor = divisor;
    }
}

class Mesh {
    attribBits;
    color;
    transform;
    data;
    yFlip = true;

    // TODO: instead of taking attribBits, take list of VertAttrib objects
    constructor(attribBits) {
        this.attribBits = attribBits;
        this.clear(); //initialize

    }

    clear() {
        this.color = [1.0, 0.8, 0.5, 1.0];
        this.transform = new Transform();
        this.data = [];
    }

    setTransform(t) {
        this.transform = t;
    }

    setColor(r, g, b, a=1) {
        if (r instanceof Color) {
            this.color[0] = r.r;
            this.color[1] = r.g;
            this.color[2] = r.b;
            this.color[3] = r.a;
            return;
        }
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
        this.color[3] = a;
    }

    setData(data) {
        this.data = data;
    }

    add(x, y, s, t, p) {
        this.data.push(x, y);
        if ((this.attribBits & VertAttrib.COLOR_BIT) === VertAttrib.COLOR_BIT) {
            this.data.push(this.color[0], this.color[1], this.color[2], this.color[3]);
        }

        if ((this.attribBits & VertAttrib.TEX_BIT) === VertAttrib.TEX_BIT) {
            console.assert(s !== undefined && t !== undefined);
            this.data.push(s, t);
        }

        if ((this.attribBits & VertAttrib.TEX_3D_BIT) === VertAttrib.TEX_3D_BIT) {
            console.assert(s !== undefined && t !== undefined && p !== undefined);
            this.data.push(s, t, p);
        }
    }

    addLine(start, end, width=1) {
        const diff = end.sub(start);
        const perp = new Vec(-diff.y, diff.x).setLength(width/2);
        // d----------c
        // |          |
        // a----------b
        const a = start.sub(perp);
        const b = end.sub(perp);
        const c = end.add(perp);
        const d = start.add(perp);
        this.add(a.x, a.y);this.add(b.x, b.y);this.add(c.x, c.y);
        this.add(a.x, a.y);this.add(c.x, c.y);this.add(d.x, d.y);

        // triangle end caps
        if (width > 1) {
            const capOffset = new Vec(diff).setLength(width/2);
            const startPoint = start.sub(capOffset);
            const endPoint = end.add(capOffset);
            this.add(a.x, a.y); this.add(d.x, d.y); this.add(startPoint.x, startPoint.y);
            this.add(c.x, c.y); this.add(b.x, b.y); this.add(endPoint.x, endPoint.y);
        }
    }

    addRect(x, y, width, height, s0=0, t0=0, s1=1, t1=1, p=0) {
        if (this.yFlip) {
            const tmp = t0;
            t0 = t1;
            t1 = tmp;
        }
        this.add(x, y, s0, t0, p);
        this.add(x+width, y, s1, t0, p);
        this.add(x+width, y+height, s1, t1, p);
        this.add(x, y, s0, t0, p);
        this.add(x+width, y+height, s1, t1, p);
        this.add(x, y+height, s0, t1, p);
    }
    
    addCircle(x, y, radius, s0=0, t0=0, s1=1, t1=1, p=0) {
        if (this.yFlip) {
            const tmp = t0;
            t0 = t1;
            t1 = tmp;
        }
        const resolution = 36;
        const rads = 2 * Math.PI / resolution;
        const sDiff = s1 - s0;
        const tDiff = t1 - t0;
        for (let i = 0; i < resolution; i++) {
            let rad0 = i * rads;
            let rad1 = (i+1) * rads;
            this.add(x, y, (s0 + s1)/2, (t0 + t1)/2, p);
            this.add(
                x+radius * Math.cos(rad0),
                y+radius * Math.sin(rad0),
                s0 + sDiff/2 * (1 + Math.cos(rad0)),
                t0 + tDiff/2 * (1 + Math.sin(rad0)),
                p,
            );
            this.add(
                x+radius * Math.cos(rad1),
                y+radius * Math.sin(rad1),
                s0 + sDiff/2 * (1 + Math.cos(rad1)),
                t0 + tDiff/2 * (1 + Math.sin(rad1)),
                p,
            );
        }
    }

    addCircleLine(x, y, radius, width=1) {
        const resolution = 36;
        const rads = 2 * Math.PI / resolution;
        for (let i = 0; i < resolution; i++) {
            let rad0 = i * rads;
            let rad1 = (i+1) * rads;

            const C0 = Math.cos(rad0);
            const C1 = Math.cos(rad1);
            const S0 = Math.sin(rad0);
            const S1 = Math.sin(rad1);

            const X0 = x + (radius-width) * C0;
            const X1 = x + radius * C0;
            const X2 = x + radius * C1;
            const X3 = x + (radius-width) * C1;

            const Y0 = y + (radius-width) * S0;
            const Y1 = y + radius * S0;
            const Y2 = y + radius * S1;
            const Y3 = y + (radius-width) * S1;


            this.add(X0, Y0);
            this.add(X1, Y1);
            this.add(X2, Y2);
            this.add(X0, Y0);
            this.add(X2, Y2);
            this.add(X3, Y3);
        }
    }
};

class Model {
    vao;
    vboList = [];
    numVertices;
    attribBits;
    drawMode;
    shader;
    textures = [];
    numInstances;
    gl;

    constructor(gl, mesh, drawMode, shader, textures=null, extraAttribs=null, numInstances=1) {
        this.gl = gl;
        this.drawMode = drawMode;
        this.shader = shader;
        if (textures !== null) {
            this.textures = textures;
        }
        this.numInstances = numInstances;

        this.attribBits = mesh.attribBits;

        let attribs = [new VertAttrib(VertAttrib.POS_LOC, 2, this.gl.FLOAT)];
        if (this.hasAttrib(VertAttrib.COLOR_BIT)) {
            attribs.push(new VertAttrib(VertAttrib.COLOR_LOC, 4, this.gl.FLOAT));
        }
        if (this.hasAttrib(VertAttrib.TEX_BIT)) {
            attribs.push(new VertAttrib(VertAttrib.TEX_LOC, 2, this.gl.FLOAT));
        }
        if (this.hasAttrib(VertAttrib.TEX_3D_BIT)) {
            attribs.push(new VertAttrib(VertAttrib.TEX_3D_LOC, 3, this.gl.FLOAT));
        }

        let parallelAttribs = [];
        if (extraAttribs !== null) {
            for (let attrib of extraAttribs) {
                if (attrib.data !== null) {
                    parallelAttribs.push(attrib);
                } else {
                    attribs.push(attrib);
                }
            }
        }

        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        for (let attrib of parallelAttribs) {
            const vbo = this.gl.createBuffer();
            this.vboList.push(vbo);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
            switch (attrib.type) {
                case this.gl.FLOAT:
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(attrib.data, attrib.type), this.gl.STATIC_DRAW);
                    this.gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, 0, 0);
                    break;
                case this.gl.INT:
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Int32Array(attrib.data, attrib.type), this.gl.STATIC_DRAW);
                    // note: alternate function vertexAttrib[I]Pointer for integers!
                    this.gl.vertexAttribIPointer(attrib.loc, attrib.size, attrib.type, false, 0, 0);
                    break;
                default:
                    throw "type not supported for vertex attrib input";
            }

            this.gl.enableVertexAttribArray(attrib.loc);
            this.gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
        }

        const vbo = this.gl.createBuffer();
        this.vboList.push(vbo);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mesh.data), this.gl.STATIC_DRAW);

        const floatBytes = this.sizeOf(this.gl.FLOAT);
        let elementSize = 0;
        for (let attrib of attribs) {
            elementSize += attrib.size;
        }
        let stride = elementSize * floatBytes;
        this.numVertices = mesh.data.length / elementSize;

        let offset = 0;
        for (let attrib of attribs) {
            this.gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, stride, offset);
            this.gl.enableVertexAttribArray(attrib.loc);
            this.gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
            offset += attrib.size * floatBytes;
        }
    }

    hasAttrib(attribBit) {
        return (this.attribBits & attribBit) === attribBit;
    }

    sizeOf(glType) {
        switch (glType) {
            case this.gl.FLOAT:
                return Float32Array.BYTES_PER_ELEMENT;
            case this.gl.INT:
                return Int32Array.BYTES_PER_ELEMENT;
            default:
                throw "length of type not specified";
        }
    }

    dispose() {
        for (let vbo of this.vboList) {
            this.gl.deleteBuffer(vbo);
        }
        this.gl.deleteVertexArray(this.vao);
    }
}

export {VertAttrib, Mesh, Model};