class TileMap {
    static TILE_SIZE = 16;
    static EMPTY = 0;
    static WALL = 1;

    rows;

    constructor(rows) {
        this.rows = rows;
    }
}

export{TileMap};