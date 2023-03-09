function checkError(gl) {
    const err = this.gl.getError();
    if (err === this.gl.NO_ERROR) {
        return;
    } else if (err === this.gl.INVALID_ENUM) {
        throw "gl error: invalid enum";
    } else if (err === this.gl.INVALID_VALUE) {
        throw "gl error: invalid value";
    } else if (err === this.gl.INVALID_OPERATION) {
        throw "gl error: invalid operation";
    } else if (err === this.gl.INVALID_FRAMEBUFFER_OPERATION) {
        throw "gl error: invalid framebuffer operation";
    } else if (err === this.gl.OUT_OF_MEMORY) {
        throw "gl error: out of memory";
    } else if (err === this.gl.CONTEXT_LOST_WEBGL) {
        throw "gl error: context lost";
    }
}

export {checkError};