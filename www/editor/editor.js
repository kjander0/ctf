import * as conf from "../conf.js";
import * as assets from "../assets.js";
import {Renderer} from "../gfx/renderer.js";
import {Camera} from "../gfx/camera.js";
import { Shader } from "../gfx/shader.js";
import { Texture } from "../gfx/texture.js";
import { Mesh, Model, VertAttrib } from "../gfx/mesh.js";
import {Vec} from "../math.js";
import {Tile, TileType, defineTileTypes, posFromRowCol} from "../map/map.js";
import {gl, initGL} from "../gfx/gl.js";
import { UIFrame, UIButton, UIImage, UIText } from "../ui.js";
import { marshal, unmarshal } from "../map/marshal.js";

// TODO
// - show error if badly formatted map file

let tileRows;

// Render
let canvas;
let camera = new Camera();
let uiCamera = new Camera();
let camPos = new Vec();
let renderer;
let gammaShader;
let screenSize = new Vec();
let finalScreenTex;

// Controls
let panLeft = false;
let panRight = false;
let panUp = false;
let panDown = false;
let selectedTileType;
let placingTiles = false;
let mouseEventPos = new Vec();
let orientation = 0;

// UI Components
let tileButtonsFrame;
let actionButtonsFrame;

window.onload = async function() {
    await conf.retrieveConf(); // important to do this first

    canvas = document.getElementById("glcanvas");
    initGL(canvas);

    await assets.loadAssets();

    defineTileTypes();

    tileRows = [[new Tile(TileType.FLOOR)]];
    selectedTileType = TileType.FLOOR;

    gammaShader = new Shader(gl, assets.texVertSrc, assets.gammaFragSrc)

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    renderer = new Renderer(gl);
    initUI();

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

    actionButtonsFrame.size.set(0, screenSize.y);
    actionButtonsFrame.horizontalAlign = UIFrame.ALIGN_LEFT;
    actionButtonsFrame.verticalAlign = UIFrame.ALIGN_TOP;
    actionButtonsFrame.layOut();

    tileButtonsFrame.size.set(screenSize);
    tileButtonsFrame.horizontalAlign = UIFrame.ALIGN_CENTRE;
    tileButtonsFrame.verticalAlign = UIFrame.ALIGN_BOTTOM;
    tileButtonsFrame.layOut();

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
            panUp = true;
            break;
        case 's':
            panDown = true;
            break;
        case 'a':
            panLeft = true;
            break;
        case 'd':
            panRight = true;
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
            panUp = false;
            break;
        case 's':
            panDown = false;
            break;
        case 'a':
            panLeft = false;
            break;
        case 'd':
            panRight = false;
            break;
        case 'r':
            orientation = (orientation + 1) % 4;
            break;
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
    for (let tileType of TileType.typeList) {
        let texture = new Tile(tileType).getAlbedoTexture();
        const btn = new UIButton(new UIImage(texture, imageSize));
        btn.userdata = tileType;
        btn.onmousedown = () => {
            selectedTileType = tileType;
        };
        tileButtonsFrame.addChild(btn);
    }

    actionButtonsFrame = new UIFrame(new Vec(), screenSize);
    actionButtonsFrame.addChild(new UIText("Pan: wasd", assets.arialFont));
    actionButtonsFrame.addChild(new UIText("Rotate: r", assets.arialFont));

    const importBtn = new UIButton(new UIText("Import", assets.arialFont));
    importBtn.onmousedown = () => {
        pickFile();
    };

    const exportBtn = new UIButton(new UIText("Export", assets.arialFont));
    exportBtn.onmousedown = () => {
        saveFile();
    };

    actionButtonsFrame.addChild(importBtn);
    actionButtonsFrame.addChild(exportBtn);
}

function pickFile() {
    const picker = document.getElementById("filePicker");
    picker.onchange = async () => {
        if (picker.files.length > 0) {
            const buf = await picker.files[0].arrayBuffer();
            tileRows = await unmarshal(buf);
        }
    };
    picker.click();
}

function saveFile() {
    const file = marshal(tileRows);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
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
    if (row < 0 || row >= tileRows.length || col < 0 || col >= tileRows[row].length) {
        return null;
    }
    return tileRows[row][col];
}

function update() {
    const camDir = new Vec();
    if (panUp) {
        camDir.y += 1;
    }
    if (panDown) {
        camDir.y -= 1;
    }
    if (panLeft) {
        camDir.x -= 1;
    }
    if (panRight) {
        camDir.x += 1;
    }
    if (camDir.x !== 0 || camDir.y !== 0) {
        camPos = camPos.add(camDir.resize(conf.TILE_SIZE));
    }

    if (placingTiles) {
        const worldPos = eventToWorldPos(mouseEventPos.x, mouseEventPos.y);
        let tile = tileAtWorldPos(worldPos);
        if (tile === null) {
            let [selectedRow, selectedCol] = worldToRowCol(worldPos);
            tile = growMap(selectedRow, selectedCol);
            if (selectedRow < 0) {
                camPos.y -= selectedRow * conf.TILE_SIZE;
            }
            if (selectedCol < 0) {
                camPos.x -= selectedCol * conf.TILE_SIZE;
            }
        }
        tile.type = selectedTileType;
        tile.orientation = orientation;
    }

    camera.update(camPos.x, camPos.y, screenSize.x, screenSize.y);
    uiCamera.update(screenSize.x/2, screenSize.y/2, screenSize.x, screenSize.y);
}

function growMap(selectedRow, selectedCol) {
    const numRows = tileRows.length;
    const numCols = tileRows[0].length;

    let extraRows = Math.abs(selectedRow);
    let extraCols = Math.abs(selectedCol);
    if (selectedRow > numRows-1) {
        extraRows = selectedRow - (numRows-1);
    }
    if (selectedCol > numCols-1) {
        extraCols = selectedCol - (numCols-1);
    }

    const rowOffset = Math.min(selectedRow, 0);
    const colOffset = Math.min(selectedCol, 0);

    const newRows = new Array(numRows + Math.abs(extraRows));
    for (let r = 0; r < newRows.length; r++) {
        newRows[r] = new Array(numCols + Math.abs(extraCols));

        for (let c = 0; c < newRows[0].length; c++) {
            const rOld = r + rowOffset;
            const cOld = c + colOffset;
            if (rOld < 0 || cOld < 0 || rOld >= numRows || cOld >= numCols) {
                newRows[r][c] = new Tile(TileType.EMPTY);
            } else {
                newRows[r][c] = tileRows[rOld][cOld];
            }
        }
    }

    tileRows = newRows;

    return newRows[selectedRow - rowOffset][selectedCol - colOffset];
}

function render() {
    gl.clearColor(0, 0, 0, 1.0);
    renderer.setAndClearTarget(finalScreenTex);
    
    const worldPos = eventToWorldPos(mouseEventPos.x, mouseEventPos.y);
    const [row, col] = worldToRowCol(worldPos);

    for (let r = 0; r < tileRows.length; r++) {
        for (let c = 0; c < tileRows[r].length; c++) {
            const tile = tileRows[r][c];
            if (tile.type === undefined) {
                console.log("ooops");
            }
            const pos = posFromRowCol(r, c);
            const tmpOrientation = tile.orientation;
            const tmpType = tile.type;

            if (r === row && c === col) {
                tile.orientation = orientation;
                tile.type = selectedTileType;
            }
            if (tile.type.onFloor) {
                renderer.drawTexture(pos.x, pos.y, conf.TILE_SIZE, conf.TILE_SIZE, assets.getTexture("floor_0_0"));
            }
            let tileTex = tile.getAlbedoTexture();
            if (tileTex !== null) {
                renderer.drawTexture(pos.x, pos.y, conf.TILE_SIZE, conf.TILE_SIZE, tileTex);
            }
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
        renderer.setColor(0.6, 0.6, 0.6);
        if (selectedTileType === tileType) {
            renderer.setColor(.6, .6, 0);
        }
        renderer.drawRect(btn.pos.x, btn.pos.y, btn.size.x, btn.size.y);

        const img = btn.content;
        if (tileType === TileType.EMPTY) {
                renderer.setColor(1.0, 0, 0);
                renderer.drawLine(img.pos, img.pos.add(img.size), 3);
                renderer.drawLine(img.pos.addXY(img.size.x, 0), img.pos.addXY(0, img.size.y), 3);
        } else {
            if (img.texture === null) {
                renderer.drawText("null", img.pos.x, img.pos.y, assets.arialFont);
            } else {
                renderer.drawTexture(img.pos.x, img.pos.y, img.size.x, img.size.y, img.texture);
            }
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