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
import { UIFrame, UIButton, UIImage, UIText } from "../ui.js";
import { marshal, unmarshal } from "./marshal.js";

// TODO
// - show error if badly formatted map file

let rows;
let camera = new Camera();
let uiCamera = new Camera();
let renderer;
let gammaShader;
let canvas;
let camDir = new Vec();
let camPos = new Vec();
let screenSize = new Vec();
let selectedTileType = Tile.WALL;
let placingTiles = false;
let mouseEventPos = new Vec();
let orientation = 0;
let finalScreenTex;

// UI Components
let tileButtonsFrame;
let actionButtonsFrame;

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

    tileButtonsFrame.size.set(screenSize);
    actionButtonsFrame.size.set(screenSize);
    tileButtonsFrame.layOut();
    actionButtonsFrame.layOut();

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
    if (tileButtonsFrame.onmousedown(uiPos.x, uiPos.y)) {
        return;
    }

    if (actionButtonsFrame.onmousedown(uiPos.x, uiPos.y)) {
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
    tileButtonsFrame = new UIFrame(new Vec(), screenSize);

    let imageSize = new Vec(50, 50);
    for (let tileType of [Tile.EMPTY, Tile.WALL, Tile.WALL_TRIANGLE, Tile.WALL_TRIANGLE_CORNER]) {
        const texture = tile_textures.getAlbedoTexture(new Tile(tileType, new Vec()));
        console.log(texture);
        const btn = new UIButton(new UIImage(texture, imageSize));
        btn.userdata = tileType;
        btn.onmousedown = () => {
            selectedTileType = tileType;
        };
        tileButtonsFrame.addChild(btn);
    }

    actionButtonsFrame = new UIFrame(new Vec(), screenSize);
    actionButtonsFrame.addChild(new UIText("Pan:    wasd", assets.arialFont));
    actionButtonsFrame.addChild(new UIText("Rotate: r", assets.arialFont));

    const importBtn = new UIButton(new UIText("Import", assets.arialFont));
    importBtn.onmousedown = () => {
        pickFile();
    };
    const exportBtn = new UIButton(new UIText("Export", assets.arialFont));
    actionButtonsFrame.addChild(importBtn);
    actionButtonsFrame.addChild(exportBtn);
}

function pickFile() {
    const picker = document.getElementById("filePicker");
    picker.onchange = async () => {
        if (picker.files.length > 0) {
            rows = await unmarshal(picker.files[0]);
        }
    };
    picker.click();
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
    renderer.render(camera);

    // draw tile highlight
    renderer.setColor(1.0, 0, 0.0);
    renderer.drawRectLine(col * conf.TILE_SIZE, row * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE);
    renderer.render(camera);

    // ========== DRAW UI ==========
    const margin = 10;
    const fontSize = 24;
    // TODO: Use UI frame + labels for these

    for (let child of actionButtonsFrame.children) {
        if (child instanceof UIText) {
            renderer.drawText(child.text, child.pos.x, child.pos.y, assets.arialFont, child.height);
        } else if (child instanceof UIButton) {
            renderer.setColor(.1, .1, .1);
            renderer.drawRect(child.pos.x, child.pos.y, child.size.x, child.size.y);
            renderer.drawText(child.content.text, child.content.pos.x, child.content.pos.y, assets.arialFont, child.content.height);
        }
    }

    for (let btn of tileButtonsFrame.children) {
        const tileType = btn.userdata;
        renderer.setColor(0.9, 0.9, 0.9);
        if (selectedTileType === tileType) {
            renderer.setColor(.9, .9, 0);
        }
        renderer.drawRect(btn.pos.x, btn.pos.y, btn.size.x, btn.size.y);

        const img = btn.content;
        switch (tileType) {
            case Tile.EMPTY:
                renderer.setColor(1.0, 0, 0);
                renderer.drawLine(img.pos, img.pos.add(img.size), 3);
                renderer.drawLine(img.pos.addXY(img.size.x, 0), img.pos.addXY(0, img.size.y), 3);
                break;
            default:
                renderer.drawTexture(img.x, img.y, img.size.x, img.size.y, img.texture);
                break;
        }
    }

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