import {gl} from "./gl.js";

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

export {checkError};