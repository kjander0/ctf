class VertexAttrib {
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

    constructor(attribBits) {
        this.attribBits = attribBits;
        this.clear(); //initialize

    }

    clear() {
        this.color = [1.0, 0.8, 0.5];
        this.transform = new Transform();
        this.data = [];
    }

    setTransform(t) {
        this.transform = t;
    }

    setColor(r, g, b) {
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
    }

    add(x, y, s, t) {
        const pos = this.transform.mul(x, y);
        this.data.push(pos.x, pos.y);
        if ((this.attribBits & ATTRIB_COLOR) === ATTRIB_COLOR) {
            this.data.push(this.color[0], this.color[1], this.color[2]);
        }

        if ((this.attribBits & ATTRIB_TEX) === ATTRIB_TEX) {
            console.assert(s !== undefined && t !== undefined);
            this.data.push(s, t);
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
        this.add(a);this.add(b);this.add(c);
        this.add(a);this.add(c);this.add(d);

        // triangle end caps
        if (width > 1) {
            const capOffset = new Vec(diff).setLength(width/2);
            this.add(a); this.add(d); this.add(start.sub(capOffset));
            this.add(c); this.add(b); this.add(end.add(capOffset));
        }
    }

    addRect(x, y, width, height, s0=0, t0=0, s1=1, t1=1) {
        this.add(x, y, s0, t0);
        this.add(x+width, y, s1, t0);
        this.add(x+width, y+height, s1, t1);
        this.add(x, y, s0, t0);
        this.add(x+width, y+height, s1, t1);
        this.add(x, y+height, s0, t1);
    }
    
    addCircle(x, y, radius, s0=0, t0=0, s1=1, t1=1) {
        const resolution = 36;
        const rads = 2 * Math.PI / resolution;
        const sDiff = s1 - s0;
        const tDiff = t1 - t0;
        for (let i = 0; i < resolution; i++) {
            let rad0 = i * rads;
            let rad1 = (i+1) * rads;
            this.add(x, y, (s0 + s1)/2, (t0 + t1)/2);
            this.add(
                x+radius * Math.cos(rad0),
                y+radius * Math.sin(rad0),
                s0 + sDiff/2 * (1 + Math.cos(rad0)),
                t0 + tDiff/2 * (1 + Math.sin(rad0)),
            );
            this.add(
                x+radius * Math.cos(rad1),
                y+radius * Math.sin(rad1),
                s0 + sDiff/2 * (1 + Math.cos(rad1)),
                t0 + tDiff/2 * (1 + Math.sin(rad1)),
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

    constructor(mesh, drawMode, shader, textures=null, extraAttribs=null, numInstances=1) {
        this.drawMode = drawMode;
        this.shader = shader;
        if (textures !== null) {
            this.textures = textures;
        }
        this.numInstances = numInstances;

        this.attribBits = mesh.attribBits;

        let attribs = [new VertexAttrib(ATTRIB_POS_LOC, 2, gl.FLOAT)];
        if (this.hasAttrib(ATTRIB_COLOR)) {
            attribs.push(new VertexAttrib(ATTRIB_COLOR_LOC, 3, gl.FLOAT));
        }
        if (this.hasAttrib(ATTRIB_TEX)) {
            attribs.push(new VertexAttrib(ATTRIB_TEX_LOC, 2, gl.FLOAT));
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

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        for (let attrib of parallelAttribs) {
            const vbo = gl.createBuffer();
            this.vboList.push(vbo);
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attrib.data), gl.STATIC_DRAW);
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, attrib.size * this.sizeOf(attrib.type), 0);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
        }

        const vbo = gl.createBuffer();
        this.vboList.push(vbo);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.data), gl.STATIC_DRAW);

        const floatBytes = this.sizeOf(gl.FLOAT);
        let elementSize = 0;
        for (let attrib of attribs) {
            elementSize += attrib.size;
        }
        let stride = elementSize * floatBytes;
        this.numVertices = mesh.data.length / elementSize;

        let offset = 0;
        for (let attrib of attribs) {
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, stride, offset);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
            offset += attrib.size * floatBytes;
        }
    }

    hasAttrib(attribBit) {
        return (this.attribBits & attribBit) === attribBit;
    }

    sizeOf(glType) {
        if (glType === this.gl.FLOAT) {
            return Float32Array.BYTES_PER_ELEMENT;
        }
        throw "length of type not specified";
    }

    dispose() {
        for (let vbo of this.vboList) {
            gl.deleteBuffer(vbo);
        }
        gl.deleteVertexArray(this.vao);
    }
}