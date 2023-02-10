class TileMap {
    static EMPTY = 0;
    static WALL = 1;

    rows;

    constructor(rows) {
        this.rows = rows;
    }
}

export{TileMap};