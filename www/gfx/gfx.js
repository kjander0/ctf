class Texture {
    glTexture;
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

    static fromUrl(url, srgb=false) {
        let tex = new Texture();
        tex.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);

        tex.width = 1;
        tex.height = 1;
    
        const level = 0;
        let internalFormat = gl.RGBA;
        if (srgb) {
            internalFormat = gl.SRGB8_ALPHA8;
        }
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            tex.width,
            tex.height,
            border,
            srcFormat,
            srcType,
            pixel
        );
    
        const image = new Image();
        image.onload = () => {
            tex.width = image.naturalWidth;
            tex.height = image.naturalHeight;

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
        };
        image.src = url;
        
        return tex;
    }

    dispose() {
        gl.deleteTexture(this.glTexture);
    }
}

class Shader {
    static currentProg = null;

    prog;
    uniformLocations = {};

    constructor(vertSrc, fragSrc) {
        const vertShader = gl.createShader(gl.VERTEX_SHADER);
        const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(vertShader, vertSrc);
        gl.shaderSource(fragShader, fragSrc);

        this.prog = gl.createProgram();
        gl.attachShader(this.prog, vertShader);
        gl.attachShader(this.prog, fragShader);

        gl.compileShader(vertShader);
        gl.compileShader(fragShader);
        gl.linkProgram(this.prog);

        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
            console.error(`link failed: ${gl.getProgramInfoLog(this.prog)}`);
            console.error(`vs info-log: ${gl.getShaderInfoLog(vertShader)}`);
            console.error(`fs info-log: ${gl.getShaderInfoLog(fragShader)}`);
            throw "program could not be compiled";
        }
    }

    getUniformLoc(name) {
        let loc = this.uniformLocations[name];
        if (loc === undefined) {
            loc = gl.getUniformLocation(this.prog, name);
            if (loc === null) {
                throw "could not find uniform: " + name;
            }
            this.uniformLocations[name] = loc;
        }
        return loc;
    }

    setUniform(name, value) {
        this.use();

        let loc = this.getUniformLoc(name);

        if (value instanceof Array || value instanceof Float32Array) {
            let len = value.length;
            if (len === 2) {
                gl.uniform2fv(loc, value);
            } else if (len === 3) {
                gl.uniform3fv(loc, value);
            } else if (len === 16) {
                gl.uniformMatrix4fv(loc, false, value);
            } else if (len === 9) {
                gl.uniformMatrix3fv(loc, false, value);
            } else {
                throw "unsupported vector uniform length";
            }
            return;
        }

        if (isNaN(value)) {
            throw "uniform type not supported";
        }
        gl.uniform1f(loc, value);
    }

    setUniformi(name, value) {
        let loc = this.getUniformLoc(name);

        if (!Number.isInteger(value)) {
            throw "expected integer for uniform: " + name;
        }
        gl.uniform1i(loc, value);
    }

    use() {
        if (Shader.currentProg === this.prog) {
            return;
        }
        Shader.currentProg = this.prog;
        gl.useProgram(this.prog);
    }

    dispose() {
        if (Shader.currentProg === this.prog) {
            Shader.currentProg = null;
        }
        gl.deleteProgram(this.prog);
    }
};

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
        [x, y] = this.transform.mulXY(x, y);
        this.data.push(x, y);
        if ((this.attribBits & ATTRIB_COLOR) === ATTRIB_COLOR) {
            this.data.push(this.color[0], this.color[1], this.color[2]);
        }

        if ((this.attribBits & ATTRIB_TEX) === ATTRIB_TEX) {
            console.assert(s !== undefined && t !== undefined);
            this.data.push(s, t);
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
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, attrib.size * sizeOf(attrib.type), 0);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
        }

        const vbo = gl.createBuffer();
        this.vboList.push(vbo);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.data), gl.STATIC_DRAW);

        const floatBytes = sizeOf(gl.FLOAT);
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

    dispose() {
        for (let vbo of this.vboList) {
            gl.deleteBuffer(vbo);
        }
        gl.deleteVertexArray(this.vao);
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

    mulXY(x, y) {
        let newX = x * this.mat[0] + y * this.mat[3] + this.mat[6];
        let newY = x * this.mat[1] + y * this.mat[4] + this.mat[7];
        return [newX, newY];
    }

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

    static translation(x, y) {
        let t = new Transform();
        t.mat[6] = x;
        t.mat[7] = y;
        return t;
    }
}

const ATTRIB_POS = 1;
const ATTRIB_COLOR = 2;
const ATTRIB_TEX = 4;

const ATTRIB_POS_LOC = 0;
const ATTRIB_COLOR_LOC = 1;
const ATTRIB_TEX_LOC = 2;

let canvas;
let gl;

let resizeCb = function() {};

let transformStack = [new Transform()];

let camX = 0;
let camY = 0;
let camTransform = new Transform();
let projMatrix;

let shapeMesh;
let texMeshMap = new Map();
let models = [];

let shapeShader, texShader;

let fbo;

const shapeVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=1) in vec3 aColor;

out vec4 vColor;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;
void main() {
    vColor = vec4(aColor, 1);
    vec2 screenPos = (uCamMatrix * vec3(aVertexPosition, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}`;

const shapeFragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;
in vec4 vColor;
void main() {
    fragColor = vColor;
}`;

const texVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=2) in vec2 aTexCoord;

out vec2 vTexCoord;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;

void main() {
    vTexCoord = aTexCoord;
    vec2 screenPos = (uCamMatrix * vec3(aVertexPosition, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}`;

const texFragSrc = `#version 300 es
precision mediump float;

uniform sampler2D uTex0;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    fragColor = texture(uTex0, vTexCoord);
}`;

function init(targetCanvas) {
    canvas = targetCanvas;
    gl = canvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        stencil: false,
        // TODO: try enable antialias
    });

    if (gl === null) {
        throw "could not get webgl2 context";
    }

    gl.disable(gl.DEPTH_TEST);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    shapeShader = new Shader(shapeVertSrc, shapeFragSrc);
    texShader = new Shader(texVertSrc, texFragSrc);

    shapeMesh = new Mesh(ATTRIB_POS | ATTRIB_COLOR);

    const resizeObserver = new ResizeObserver(() => {
        _onresize();
    });
    resizeObserver.observe(canvas);

    _onresize(); // initial resize

    fbo = gl.createFramebuffer();
}

function _onresize() {
    // TODO: throttle resize with timer!!!
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    const scaleX = 2 / gl.drawingBufferWidth;
    const scaleY = 2 / gl.drawingBufferHeight;

    projMatrix = [
        scaleX, 0, 0, 0,
        0, scaleY, 0, 0,
        0, 0, -1, 0,
        -1, -1, 0, 1,
      ];
    
    setCamera(camX, camY);

    resizeCb(gl.drawingBufferWidth, gl.drawingBufferHeight);
}

function setResizeCb(cb) {
    resizeCb = cb;
}

// TODO: pass in transform matrix of camera, then we do affine inverse here.
function setCamera(x, y) {
    camX = x;
    camY = y;
    camTransform = Transform.translation(gl.drawingBufferWidth/2.0 - camX, gl.drawingBufferHeight/2.0 - camY);
}

function pushTransform(t) {
    transformStack.push(transformStack[transformStack.length-1].combine(t));
}

function popTransform() {
    if (transformStack.length < 2) {
        return;
    }
    transformStack.pop();
}

function getTransform() {
    return transformStack[transformStack.length-1];
}

function setColor (r, g, b) {
    shapeMesh.setColor(r, g, b);
}

function drawRect(x, y, width, height) {
    shapeMesh.setTransform(transformStack[transformStack.length-1]);
    shapeMesh.addRect(x, y, width, height);
}

function drawCircle(x, y, radius) {
    shapeMesh.setTransform(transformStack[transformStack.length-1]);
    shapeMesh.addCircle(x, y, radius);
}

function drawCircleLine(x, y, radius, width=1) {
    shapeMesh.setTransform(transformStack[transformStack.length-1]);
    shapeMesh.addCircleLine(x, y, radius, width);
}

function drawTexture(x, y, width, height, texture) {
    let texMesh = texMeshMap.get(texture);
    if (texMesh === undefined) {
        texMesh = new Mesh(ATTRIB_POS | ATTRIB_TEX);
        texMeshMap.set(texture, texMesh);
    }
    texMesh.setTransform(transformStack[transformStack.length-1]);
    texMesh.addRect(x, y, width, height);
}

function drawModel(model) {
    models.push(model);
}

function render(targetTexture=null) {
    if (targetTexture !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture.glTexture, 0);
        console.assert(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE);
    } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    const disposeModels = [];

    const shapeModel = new Model(shapeMesh, gl.TRIANGLES, shapeShader)
    models.push(shapeModel);
    disposeModels.push(shapeModel);
    shapeMesh.clear();

    texMeshMap.forEach((mesh, texture) => {
        const texModel = new Model(mesh, gl.TRIANGLES, texShader, [texture]);
        models.push(texModel);
        disposeModels.push(texModel);
        mesh.clear();
    });

    for (let model of models) {
        _renderModel(model);
    }
    models = [];
    
    // TODO: reuse vao/vbo instead of disposing every frame
    for (let model of disposeModels) {
        model.dispose();
    }

    checkError();
}

function checkError() {
    const err = gl.getError();
    if (err === gl.NO_ERROR) {
        return;
    } else if (err === gl.INVALID_ENUM) {
        throw "gl error: invalid enum";
    } else if (err === gl.INVALID_VALUE) {
        throw "gl error: invalid value";
    } else if (err === gl.INVALID_OPERATION) {
        throw "gl error: invalid operation";
    } else if (err === gl.INVALID_FRAMEBUFFER_OPERATION) {
        throw "gl error: invalid framebuffer operation";
    } else if (err === gl.OUT_OF_MEMORY) {
        throw "gl error: out of memory";
    } else if (err === gl.CONTEXT_LOST_WEBGL) {
        throw "gl error: context lost";
    }
}

function _renderModel(model) {
    if (model.numVertices === 0) {
        return;
    }

    model.shader.use();

    model.shader.setUniform("uProjMatrix", projMatrix);
    model.shader.setUniform("uCamMatrix", camTransform.mat);

    if (model.hasAttrib(ATTRIB_TEX) && model.textures.length ===0) {
        throw "missing textures for model with tex coord attribs";
    }

    for (let i = 0; i < model.textures.length; i++) {
        let tex = model.textures[i];
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
        model.shader.setUniformi("uTex"+i, i);
    }

    gl.bindVertexArray(model.vao);

    gl.drawArraysInstanced(model.drawMode, 0, model.numVertices, model.numInstances);
}

function sizeOf(glType) {
    if (glType === gl.FLOAT) {
        return Float32Array.BYTES_PER_ELEMENT;
    }
    throw "length of type not specified";
}

export {
    Shader,
    Transform,
    Texture,
    Mesh,
    VertexAttrib,
    Model,
    init,
    setResizeCb,
    setCamera,
    pushTransform,
    popTransform,
    getTransform,
    setColor,
    drawRect,
    drawCircle,
    drawCircleLine,
    drawTexture,
    drawModel,
    render,
    gl,
    texVertSrc,
    texFragSrc,
    ATTRIB_POS,
    ATTRIB_COLOR,
    ATTRIB_TEX,
};