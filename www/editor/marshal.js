
function marshal(rows) {
    const arrBuf = new ArrayBuffer(512 * 1024);
    const view = new DataView(arrBuf);
    let byteOffset = 0;


    // TODO: write size in rows/columns
    
    let currentTile = null;
    let tileCount = 0;
    for (let row of rows) {
        for (let tile of row) {
            if (currentTile === null || currentTile.type !== tile.type || currentTile.orientation !== tile.orientation) {
                // TODO: set bits on int and write
                view.setUint8(byteOffset++, tile.type);
                currentTile = tile;
            }
            tileCount += 1;
        }
    }

}

async function unmarshal(file) {
    const arrBuf = await file.arrayBuffer();
}

export {
    marshal,
    unmarshal,
}