import { gl } from "./gl.js";

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
            throw "uniform type not supported: " + name;
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

export {Shader};