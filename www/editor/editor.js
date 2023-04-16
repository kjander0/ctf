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
let frame;
let selectedTileType = Tile.WALL;

class Button {
    pos = new Vec();
    size;

    constructor(size) {
        this.size = new Vec(size);
    }

    onmousedown(x, y) {
        console.log("button onpress()");
    }

    ondraw() {
        console.log("button ondraw()");
    }
}

class Frame {
    pos;
    size;
    margin;

    children = [];

    constructor(pos, size, margin=10) {
        this.pos = new Vec(pos);
        this.size = new Vec(size);
        this.margin = margin;
    }

    addChild(child) {
        this.children.push(child);
    }

    onmousedown(x, y) {
        for (let child of this.children) {
            if (x > child.pos.x && x < child.pos.x + child.size.x) {
                if (y > child.pos.y && child.pos.y + child.size.y) {
                    child.onmousedown(x, y);
                }
            }
        }
    }

    onresize(width, height) {
        this.size.set(width, height);

        let contentWidth = this.children.length * this.margin;
        for (let child of this.children) {
            contentWidth += child.size.x;
        }
        
        let childX = (this.size.x - contentWidth)/2;
        for (let child of this.children) {
            child.pos.x = childX;
            child.pos.y = this.margin;
            childX += this.margin + child.size.x;
        }
    }

    ondraw() {
        for (let child of this.children) {
            child.ondraw();
        }
    }
}


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
    initUI();
    loadMap();

    document.addEventListener("keydown", (event) => onKeyDown(event));
    document.addEventListener("keyup", (event) => onKeyUp(event));
    document.addEventListener("mousedown", (event) => onMouseDown(event));
    document.addEventListener("mouseup", (event) => onMouseUp(event));

    const resizeObserver = new ResizeObserver(() => {
        onresize();
    });
    resizeObserver.observe(canvas);
    onresize(); // initial resize

    function onFrame() {
        update();
        render();
        window.requestAnimationFrame(onFrame);
    }
    window.requestAnimationFrame(onFrame);
};

function initUI() {
    frame = new Frame(new Vec(), screenSize);
    const buttonSize = new Vec(50, 50);
    const wallButton = new Button(buttonSize);
    const offset = (wallButton.size.x - conf.TILE_SIZE) / 2;
    wallButton.ondraw = () => {
        renderer.setColor(1, 1, 1);
        renderer.drawRect(wallButton.pos.x, wallButton.pos.y, wallButton.size.x, wallButton.size.y);
        renderer.setColor(0.3, 0.3, 0.3);
        renderer.drawRect(wallButton.pos.x + offset, wallButton.pos.y + offset, conf.TILE_SIZE, conf.TILE_SIZE);
    }

    const wallTriangle = new Button(buttonSize);
    wallTriangle.ondraw = () => {
        renderer.setColor(1, 1, 1);
        renderer.drawRect(wallTriangle.pos.x, wallTriangle.pos.y, wallTriangle.size.x, wallTriangle.size.y);
        renderer.setColor(0.3, 0.3, 0.3);
        const p0 = wallTriangle.pos.addXY(offset, offset);
        const p1 = p0.addXY(conf.TILE_SIZE, 0);
        const p2 = p0.addXY(conf.TILE_SIZE/2, conf.TILE_SIZE/2);
        renderer.drawTriangle(p0, p1, p2);
    }

    const wallCorner = new Button(buttonSize);
    wallCorner.ondraw = () => {
        renderer.setColor(1, 1, 1);
        renderer.drawRect(wallCorner.pos.x, wallCorner.pos.y, wallCorner.size.x, wallCorner.size.y);
        renderer.setColor(0.3, 0.3, 0.3);
        const p0 = wallCorner.pos.addXY(offset, offset);
        const p1 = p0.addXY(conf.TILE_SIZE, 0);
        const p2 = p0.addXY(0, conf.TILE_SIZE);
        renderer.drawTriangle(p0, p1, p2);
    }

    frame.addChild(wallButton);
    frame.addChild(wallTriangle);
    frame.addChild(wallCorner);
}

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

    frame.onresize(screenSize.x, screenSize.y);

    gl.viewport(0, 0, screenSize.x, screenSize.y);
}

function onKeyDown(event) {
    if (event.repeat) {
        return
    }

    let key = event.key.toLowerCase();
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

function eventToWorldPos(clientX, clientY) {
    const clientRect = canvas.getBoundingClientRect();
    const relPos = new Vec(clientX / clientRect.width * screenSize.x, (1 - clientY / clientRect.height) *  screenSize.y);
    const aimPos = camera.unproject(relPos);
    return aimPos;
}

function worldToTileCoords(worldPos) {
    return [Math.floor(worldPos.y / conf.TILE_SIZE), Math.floor(worldPos.x / conf.TILE_SIZE)];
}

function tileAtWorldPos(worldPos) {
    const [row, col] = worldToTileCoords(worldPos);
    if (row < 0 || row >= rows.length || col < 0 || col >= rows[row].length) {
        return null;
    }
    return rows[row][col];
}

function onMouseDown(event) {
    const worldPos = eventToWorldPos(event.clientX, event.clientY);
    const tile = tileAtWorldPos(worldPos);
    if (tile === null) {
        return;
    }
    tile.type = selectedTileType;
}

function onMouseUp(event) {
}

function update() {
    if (camDir.x !== 0 || camDir.y !== 0) {
        camPos = camPos.add(camDir.resize(conf.TILE_SIZE));
    }
    camera.update(camPos.x, camPos.y, screenSize.x, screenSize.y);
    uiCamera.update(screenSize.x/2, screenSize.y/2, screenSize.x, screenSize.y);
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

    // ========== UI RENDERING ==========
    frame.ondraw();
    renderer.render(uiCamera);
}