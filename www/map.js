import * as conf from "./conf.js"
import { Vec } from "./math.js"

class Tile {
    static EMPTY = 0;
    static WALL = 1;
    static JAIL = 2;
    static SPAWN = 3;
    static WALL_TRIANGLE = 4;

    type = null;
    pos = null;

    constructor(type, pos) {
        this.type = type;
        this.pos = pos;
    }
}

class Map {
    tileRows = [];

    constructor(rows) {
        for (let r = 0; r < rows.length; r++) {
            this.tileRows.push([]);
            for (let c = 0; c < rows[r].length; c++) {
                this.tileRows[r].push(new Tile(rows[r][c], new Vec(c, r).scale(conf.TILE_SIZE)));
            }
        }
    }

    sampleSolidTiles(pos, radius) {
        let col = Math.floor(pos.x / conf.TILE_SIZE);
        let row = Math.floor(pos.y / conf.TILE_SIZE);

        let steps = Math.floor(radius/conf.TILE_SIZE) + 1;
        let samples = [];
        for (let r = row - steps; r <= row+steps; r++) {
            for (let c = col - steps; c <= col+steps; c++) {
                if (r < 0 || r >= this.tileRows.length || c < 0 || c >= this.tileRows[r].length) {
                    continue;
                }
                const tile = this.tileRows[r][c];
                if (tile.type != Tile.WALL && tile.type != Tile.WALL_TRIANGLE) {
                    continue;
                }
                samples.push(tile);
            }
        }
        return samples;
    }
}

export{Tile, Map};