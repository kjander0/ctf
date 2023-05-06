import { Tile, TileType } from "./map.js";

function logBits(dec) {
    console.log((dec >>> 0).toString(2));
}

function marshal(rows) {
    rows = trimRows(rows);
    console.log(rows.length, rows[0].length)

    const arrBuf = new ArrayBuffer(1024 * 1024);
    const view = new DataView(arrBuf);
    let byteOffset = 0;

    view.setUint16(byteOffset, rows[0].length);
    byteOffset += 2;
    
    function writeChunk(tile, count) {
        let bits = tile.type.id;
        bits = (bits<<2) | tile.orientation;
        bits = (bits<<4); // TODO tile variation
        bits = (bits<<5) | (count-1); // subtract 1 to support tileCount starting from 1
        view.setUint16(byteOffset, bits);
        byteOffset += 2;
    }

    let currentTile = null;
    let tileCount = 0;
    const maxTileCount = 32;
    for (let row of rows) {
        for (let tile of row) {
            if (currentTile === null) {
                currentTile = tile;
            }

            if (currentTile.type !== tile.type || 
                currentTile.orientation !== tile.orientation || 
                tileCount === maxTileCount) {

                writeChunk(currentTile, tileCount);
                currentTile = tile;
                tileCount = 0;
            }
            tileCount += 1;
        }
    }
    if (tileCount > 0) {
        writeChunk(currentTile, tileCount);
    }

    return new File([new DataView(arrBuf, 0, byteOffset)], "map.bin");
}

async function unmarshal(arrayBuffer) {
    const view =  new DataView(arrayBuffer);
    let byteOffset = 0;
    const rowSize = view.getUint16(byteOffset);
    byteOffset += 2;

    const rowList = [[]];
    while (byteOffset < view.byteLength) {
        let bits = view.getUint16(byteOffset);
        byteOffset += 2;
        let tileCount = (bits & ~(~0 << 5)) + 1; // add 1 to support tileCount starting from 1
        bits >>= 5;
        let variation = bits & ~(~0 << 4);
        bits >>= 4;
        let orientation = bits & ~(~0 << 2);
        bits >>= 2;
        let typeId = bits & ~(~0 << 5);

        for (let i = 0; i < tileCount; i++) {
            let row = rowList[rowList.length-1];
            if (row.length === rowSize) {
                row = [];
                rowList.push(row);
            }
            const rowIndex = rowList.length-1;
            const colIndex = row.length;
            const tile = new Tile(TileType.fromId(typeId), rowIndex, colIndex);
            tile.orientation = orientation;
            row.push(tile);
        }
    }

    return rowList;
}

function trimRows(rows) {
    let rowStart = rows.length-1, rowEnd = 0;
    let colStart = rows[0].length-1, colEnd = 0;

    for (let ri = 0; ri < rows.length; ri++) {
        let rowEmpty = true;
        for (let ci = 0; ci < rows[ri].length; ci++) {
            if (rows[ri][ci].type !== TileType.EMPTY) {
                rowEmpty = false;
                if (ci < colStart) {
                    colStart = ci;
                }

                if (ci > colEnd) {
                    colEnd = ci;
                }
            }
        }

        if (!rowEmpty) {
            if (ri < rowStart) {
                rowStart = ri;
            }
            if (ri > rowEnd) {
                rowEnd = ri;
            }
        }
    }
    
    const numRows = rowEnd - rowStart + 1;
    const newRows = new Array(numRows);
    for (let r = 0; r < numRows; r++) {
        newRows[r] = rows[r + rowStart].slice(colStart, colEnd+1);
    }
    
    console.log("trim to: ", rowStart, rowEnd, colStart, colEnd);

    return newRows;
}

export {
    marshal,
    unmarshal,
}