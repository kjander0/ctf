let gl = null;

function initGL(canvas) {
    gl = canvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        stencil: false,
        // TODO: try enable antialias
    });

    if (gl === null) {
        throw "could not get webgl2 context";
    }
}

export {initGL, gl};