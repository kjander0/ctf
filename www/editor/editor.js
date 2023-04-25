import * as conf from "../conf.js";
import * as assets from "../assets.js";
import {Renderer} from "../gfx/renderer.js";
import {Camera} from "../gfx/camera.js";
import { Shader } from "../gfx/shader.js";
import { Texture } from "../gfx/texture.js";
import { Mesh, Model, VertAttrib } from "../gfx/mesh.js";
import * as tile_textures from "../gfx/tile_textures.js";
import {Vec} from "../math.js";
import {Tile} from "../map.js";
import {gl, initGL} from "../gfx/gl.js";

let rows;
let camera = new Camera();
let uiCamera = new Camera();
let renderer;
let gammaShader;
let canvas;
let camDir = new Vec();
let camPos = new Vec();
let screenSize = new Vec();
let frame;
let selectedTileType = Tile.WALL;
let placingTiles = false;
let mouseEventPos = new Vec();
let orientation = 0;
let finalScreenTex;

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
                if (y > child.pos.y && y < child.pos.y + child.size.y) {
                    child.onmousedown(x, y);
                    return true;
                }
            }
        }
        return false;
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
    initGL(canvas);

    await assets.loadAssets(gl);

    gammaShader = new Shader(gl, assets.texVertSrc, assets.gammaFragSrc)

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    renderer = new Renderer(gl);
    initUI();
    loadMap();

    document.addEventListener("keydown", (event) => onKeyDown(event));
    document.addEventListener("keyup", (event) => onKeyUp(event));
    document.addEventListener("mousedown", (event) => onMouseDown(event));
    document.addEventListener("mouseup", (event) => onMouseUp(event));
    document.addEventListener("mousemove", (event) => onMouseMove(event));

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

function onresize() {
    // TODO: throttle resize with timer!!!
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    screenSize.set(gl.drawingBufferWidth, gl.drawingBufferHeight);

    frame.onresize(screenSize.x, screenSize.y);

    gl.viewport(0, 0, screenSize.x, screenSize.y);

    finalScreenTex = Texture.fromSize(
        screenSize.x,
        screenSize.y,
    );
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
        case 'r':
            orientation = (orientation + 1) % 4;
            break;
    }
    if (camDir.x !== 0 || camDir.y !== 0) {
        camDir = camDir.resize(conf.TILE_SIZE);
    }
}

function onMouseDown(event) {
    const uiPos = eventToUIPos(event.clientX, event.clientY);
    if (frame.onmousedown(uiPos.x, uiPos.y)) {
        return;
    }

    placingTiles = true;
}

function onMouseUp(event) {
    placingTiles = false;
}

function onMouseMove(event) {
    mouseEventPos.set(event.clientX, event.clientY);
}

function initUI() {
    frame = new Frame(new Vec(), screenSize);

    const buttonSize = new Vec(50, 50);
    const offset = (buttonSize.x - conf.TILE_SIZE) / 2;

    const clearButton = new Button(buttonSize);
    clearButton.ondraw = () => {
        renderer.setColor(0.9, 0.9, 0.9);
        if (selectedTileType === Tile.EMPTY) {
            renderer.setColor(0.9, 0.9, 0);
        }
        renderer.drawRect(clearButton.pos.x, clearButton.pos.y, clearButton.size.x, clearButton.size.y);
        renderer.setColor(1.0, 0, 0);
        renderer.drawLine(clearButton.pos.addXY(offset, offset), clearButton.pos.addXY(offset + conf.TILE_SIZE, offset + conf.TILE_SIZE), 3);
        renderer.drawLine(clearButton.pos.addXY(offset + conf.TILE_SIZE, offset), clearButton.pos.addXY(offset, offset + conf.TILE_SIZE), 3);
    }
    clearButton.onmousedown = () => {
        selectedTileType = Tile.EMPTY;
    }

    const wallButton = new Button(buttonSize);
    wallButton.ondraw = () => {
        renderer.setColor(0.9, 0.9, 0.9);
        if (selectedTileType === Tile.WALL) {
            renderer.setColor(0.9, 0.9, 0);
        }
        renderer.drawRect(wallButton.pos.x, wallButton.pos.y, wallButton.size.x, wallButton.size.y);
        renderer.drawTexture(wallButton.pos.x + offset, wallButton.pos.y + offset, conf.TILE_SIZE, conf.TILE_SIZE, assets.getTexture("wall"));

    }
    wallButton.onmousedown = () => {
        selectedTileType = Tile.WALL;
    }

    const wallTriangle = new Button(buttonSize);
    wallTriangle.ondraw = () => {
        renderer.setColor(0.9, 0.9, 0.9);
        if (selectedTileType === Tile.WALL_TRIANGLE) {
            renderer.setColor(0.9, 0.9, 0);
        }
        renderer.drawRect(wallTriangle.pos.x, wallTriangle.pos.y, wallTriangle.size.x, wallTriangle.size.y);
        renderer.drawTexture(wallTriangle.pos.x + offset, wallTriangle.pos.y + offset, conf.TILE_SIZE, conf.TILE_SIZE, assets.getTexture("wall_triangle0"));
    }
    wallTriangle.onmousedown = () => {
        selectedTileType = Tile.WALL_TRIANGLE;
    }

    const wallCorner = new Button(buttonSize);
    wallCorner.ondraw = () => {
        renderer.setColor(0.9, 0.9, 0.9);
        if (selectedTileType === Tile.WALL_TRIANGLE_CORNER) {
            renderer.setColor(0.9, 0.9, 0);
        }
        renderer.drawRect(wallCorner.pos.x, wallCorner.pos.y, wallCorner.size.x, wallCorner.size.y);
        renderer.drawTexture(wallCorner.pos.x + offset, wallCorner.pos.y + offset, conf.TILE_SIZE, conf.TILE_SIZE, assets.getTexture("wall_triangle_corner0"));
    }
    wallCorner.onmousedown = () => {
        selectedTileType = Tile.WALL_TRIANGLE_CORNER;
    }

    frame.addChild(clearButton);
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

function eventToWorldPos(clientX, clientY) {
    const clientRect = canvas.getBoundingClientRect();
    const relPos = new Vec(clientX / clientRect.width * screenSize.x, (1 - clientY / clientRect.height) *  screenSize.y);
    const worldPos = camera.unproject(relPos);
    return worldPos;
}

function eventToUIPos(clientX, clientY) {
    const clientRect = canvas.getBoundingClientRect();
    const relPos = new Vec(clientX / clientRect.width * screenSize.x, (1 - clientY / clientRect.height) *  screenSize.y);
    const uiPos = uiCamera.unproject(relPos);
    return uiPos;
}

function worldToRowCol(worldPos) {
    return [Math.floor(worldPos.y / conf.TILE_SIZE), Math.floor(worldPos.x / conf.TILE_SIZE)];
}

function tileAtWorldPos(worldPos) {
    const [row, col] = worldToRowCol(worldPos);
    if (row < 0 || row >= rows.length || col < 0 || col >= rows[row].length) {
        return null;
    }
    return rows[row][col];
}

function update() {
    if (camDir.x !== 0 || camDir.y !== 0) {
        camPos = camPos.add(camDir.resize(conf.TILE_SIZE));
    }
    camera.update(camPos.x, camPos.y, screenSize.x, screenSize.y);
    uiCamera.update(screenSize.x/2, screenSize.y/2, screenSize.x, screenSize.y);

    if (placingTiles) {
        const worldPos = eventToWorldPos(mouseEventPos.x, mouseEventPos.y);
        const tile = tileAtWorldPos(worldPos);
        if (tile === null) {
            return;
        }
        tile.type = selectedTileType;
        tile.orientation = orientation;
    }
}


function render() {
    gl.clearColor(0, 0, 0, 1.0);
    renderer.setAndClearTarget(finalScreenTex);
    
    const worldPos = eventToWorldPos(mouseEventPos.x, mouseEventPos.y);
    const [row, col] = worldToRowCol(worldPos);

    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            const tile = rows[r][c];
            const tmpOrientation = tile.orientation;
            const tmpType = tile.type;

            if (r === row && c === col) {
                tile.orientation = orientation;
                tile.type = selectedTileType;
            }

            let tileTex = tile_textures.getAlbedoTexture(tile);
            if (tileTex === null) {
                tileTex = assets.getTexture("floor");
            }
            renderer.drawTexture(tile.pos.x, tile.pos.y, conf.TILE_SIZE, conf.TILE_SIZE, tileTex);
            tile.orientation = tmpOrientation;
            tile.type = tmpType;
        }
    }

    // draw tile highlight
    renderer.setColor(1.0, 0, 0.0);
    renderer.drawRectLine(col * conf.TILE_SIZE, row * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE);

    renderer.render(camera);

    // draw UI
    frame.ondraw();
    const margin = 10;
    const height = 20;
    renderer.drawText("Pan:    wasd", margin, screenSize.y - (margin+height), assets.arialFont, height);
    renderer.drawText("Rotate: r", margin, screenSize.y - 2*(margin+height), assets.arialFont, height);
    renderer.render(uiCamera);

    // Gamma correct everything
    let screenMesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.TEX_BIT);
    screenMesh.addRect(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, 0, 1, 1);
    let screenModel = new Model(
        gl,
        screenMesh,
        gl.TRIANGLES,
        gammaShader,
        [finalScreenTex]
    );
    renderer.drawModel(screenModel);
    renderer.setAndClearTarget(null);
    renderer.render(uiCamera);
}