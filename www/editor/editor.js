import * as conf from "../conf.js";
import * as asset from "../assets.js";
import {Renderer} from "../gfx/renderer.js";
import {Camera} from "../gfx/camera.js";
import {Vec} from "../math.js";
import {Tile} from "../map.js";

let rows;
let camera = new Camera();
let uiCamera = new Camera();
let renderer;
let canvas;
let gl;
let camDir = new Vec();
let camPos = new Vec();
let screenSize = new Vec();

window.onload = async function() {
    await conf.retrieveConf(); // important to do this first

    canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        stencil: false,
        // TODO: try enable antialias
    });

    if (gl === null) {
        throw "could not get webgl2 context";
    }

    await asset.loadAssets(gl);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    renderer = new Renderer(gl);

    document.addEventListener("keydown", (event) => onKeyDown(event));
    document.addEventListener("keyup", (event) => onKeyUp(event));
    document.addEventListener("mousedown", (event) => onMouseDown(event));
    document.addEventListener("mouseup", (event) => onMouseUp(event));

    const resizeObserver = new ResizeObserver(() => {
        onresize();
    });
    resizeObserver.observe(canvas);
    onresize(); // initial resize

    loadMap();

    function onFrame() {
        update();
        render();
        window.requestAnimationFrame(onFrame);
    }
    window.requestAnimationFrame(onFrame);
};

function loadMap() {
    let rawRows = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 0, 5, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 5, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 1, 1, 1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 5, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    rows = [];
    for (let r = 0; r < rawRows.length; r++) {
        rows.push([]);
        for (let c = 0; c < rawRows[r].length; c++) {
            rows[r].push(new Tile(rawRows[r][c], new Vec(c, r).scale(conf.TILE_SIZE)));
        }
    }
}

function onresize() {
    // TODO: throttle resize with timer!!!
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    screenSize.set(gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.viewport(0, 0, screenSize.x, screenSize.y);
}

function onKeyDown(event) {
    if (event.repeat) {
        return
    }

    let key = event.key.toLowerCase();
    console.log(key);
    switch (key) {
        case 'w':
            camDir.y = 1;
            break;
        case 's':
            camDir.y = -1;
            break;
        case 'a':
            camDir.x = -1;
            break;
        case 'd':
            camDir.x = 1;
            break;
    }
}

function onKeyUp(event) {
    if (event.repeat) {
        return
    }

    let key = event.key.toLowerCase();
    console.log(key);
    switch (key) {
        case 'w':
            camDir.y = 0;
            break;
        case 's':
            camDir.y = 0;
            break;
        case 'a':
            camDir.x = 0;
            break;
        case 'd':
            camDir.x = 0;
            break;
    }
    if (camDir.x !== 0 || camDir.y !== 0) {
        camDir = camDir.resize(conf.TILE_SIZE);
    }
}

function _relPos(clientX, clientY) {
    const clientRect = this.graphics.canvas.getBoundingClientRect();
    return new Vec(clientX / clientRect.width * this.graphics.screenSize.x, (1 - clientY / clientRect.height) *  this.graphics.screenSize.y);
}

function onMouseDown(event) {
    // if (this._doRecord) {
    //     this._recordedEvents.push(event);
    //     this._didRecordEvent = true;
    // }

    // let cmdIndex = Input.CMD_SHOOT;
    // if (event.button === 2) {
    //     cmdIndex = Input.CMD_SECONDARY;
    // }
    // let cmd = this._commands[cmdIndex];
    // if (cmd === undefined) {
    //     return;
    // }

    // cmd.mousePos = this._relPos(event.clientX, event.clientY);
    // cmd.active = true;
    // cmd.wasActivated = true;
    // cmd._pressed = true;
}

function onMouseUp(event) {
    // let cmdIndex = Input.CMD_SHOOT;
    // if (event.button === 2) {
    //     cmdIndex = Input.CMD_SECONDARY;
    // }
    // let cmd = this._commands[cmdIndex];
    // if (cmd === undefined) {
    //     return;
    // }
    // cmd.mousePos = this._relPos(event.clientX, event.clientY);
    // cmd._pressed = false;
}

function update() {
    if (camDir.x !== 0 || camDir.y !== 0) {
        camPos = camPos.add(camDir.resize(conf.TILE_SIZE));
    }
    camera.update(camPos.x, camPos.y, screenSize.x, screenSize.y);
}

function render() {
    gl.clearColor(0, 0, 0, 1.0);
    renderer.setAndClearTarget(null);

    const p0 = new Vec();
    const p1 = new Vec();
    const p2 = new Vec();

    renderer.setColor(0.3, 0.3, 0.3);
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            switch(rows[r][c].type) {
                case Tile.WALL:
                    renderer.drawRect(c * conf.TILE_SIZE, r * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE);
                    break;
                case Tile.WALL_TRIANGLE:
                case Tile.WALL_TRIANGLE_CORNER:
                    rows[r][c].setTrianglePoints(p0, p1, p2);
                    renderer.drawTriangle(p0, p1, p2);
                    break;
            }
        }
    }

    renderer.render(camera);
}