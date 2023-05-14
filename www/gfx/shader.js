class Shader {
    static currentProg = null;

    gl;
    prog;
    uniformLocations = {};

    constructor(gl, vertSrc, fragSrc) {
        this.gl = gl;
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(vertShader, vertSrc);
        this.gl.shaderSource(fragShader, fragSrc);

        this.prog = this.gl.createProgram();
        this.gl.attachShader(this.prog, vertShader);
        this.gl.attachShader(this.prog, fragShader);

        this.gl.compileShader(vertShader);
        this.gl.compileShader(fragShader);
        this.gl.linkProgram(this.prog);

        if (!this.gl.getProgramParameter(this.prog, this.gl.LINK_STATUS)) {
            console.error(`link failed: ${this.gl.getProgramInfoLog(this.prog)}`);
            console.error(`vs info-log: ${this.gl.getShaderInfoLog(vertShader)}`);
            console.error(`fs info-log: ${this.gl.getShaderInfoLog(fragShader)}`);
            throw "program could not be compiled";
        }
    }

    getUniformLoc(name) {
        let loc = this.uniformLocations[name];
        if (loc === undefined) {
            loc = this.gl.getUniformLocation(this.prog, name);
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
                this.gl.uniform2fv(loc, value);
            } else if (len === 3) {
                this.gl.uniform3fv(loc, value);
            } else if (len === 16) {
                this.gl.uniformMatrix4fv(loc, false, value);
            } else if (len === 9) {
                this.gl.uniformMatrix3fv(loc, false, value);
            } else {
                throw "unsupported vector uniform length";
            }
            return;
        }

        if (isNaN(value)) {
            throw "uniform type not supported: " + name;
        }
        this.gl.uniform1f(loc, value);
    }

    setUniformi(name, value) {
        let loc = this.getUniformLoc(name);

        if (!Number.isInteger(value)) {
            throw "expected integer for uniform: " + name;
        }
        this.gl.uniform1i(loc, value);
    }

    use() {
        if (Shader.currentProg === this.prog) {
            return;
        }
        Shader.currentProg = this.prog;
        this.gl.useProgram(this.prog);
    }

    dispose() {
        if (Shader.currentProg === this.prog) {
            Shader.currentProg = null;
        }
        this.gl.deleteProgram(this.prog);
    }
};

export {Shader};