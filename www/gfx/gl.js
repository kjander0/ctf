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

    const paramsOfInterest = [
        "MAX_TEXTURE_SIZE",
        "MAX_VIEWPORT_DIMS",
        "MAX_VERTEX_TEXTURE_IMAGE_UNITS",
        "MAX_TEXTURE_IMAGE_UNITS",
        "MAX_VERTEX_ATTRIBS",
        "ALIASED_POINT_SIZE_RANGE",
    ]

    for (let param of paramsOfInterest) {
        console.log(param + " : " + gl.getParameter(gl[param]));
    }
}

export {initGL, gl};