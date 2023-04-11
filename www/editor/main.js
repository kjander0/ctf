import * as conf from "../conf.js";
import * as asset from "../assets.js";
import {Renderer} from "../gfx/renderer.js";

const rows = [];
let renderer;

window.onload = async function() {
    await conf.retrieveConf(); // important to do this first
    await asset.loadAssets();

    const canvas = document.getElementById("glcanvas");
    this.gl = canvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        stencil: false,
        // TODO: try enable antialias
    });

    if (this.gl === null) {
        throw "could not get webgl2 context";
    }

    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

    this.renderer = new Renderer(this.gl);

    function onFrame() {
        update();
        render();
        window.requestAnimationFrame(onFrame);
    }
    window.requestAnimationFrame(onFrame);
};

function update() {

}

function render() {
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            const tile = rows[r][c];
            
        }
    }
}