import * as conf from "./conf.js"
import { Vec } from "./math.js"

class Map {
    static EMPTY = 0;
    static WALL = 1;
    static JAIL = 2;
    static SPAWN = 3;
    static WALL_TRIANGLE = 4;

    rows;

    constructor(rows) {
        this.rows = rows;
    }

    sampleSolidTiles(pos, radius) {
        let col = Math.floor(pos.x / conf.TILE_SIZE);
        let row = Math.floor(pos.y / conf.TILE_SIZE);

        let steps = Math.floor(radius/conf.TILE_SIZE) + 1;
        let samples = [];
        for (let r = row - steps; r <= row+steps; r++) {
            for (let c = col - steps; c <= col+steps; c++) {
                if (r < 0 || r >= this.rows.length || c < 0 || c >= this.rows[r].length) {
                    continue;
                }
                if (this.rows[r][c] != Map.WALL && this.rows[r][c] != Map.WALL_TRIANGLE) {
                    continue;
                }
                samples.push(new Vec(c, r).scale(conf.TILE_SIZE));
            }
        }
        return samples;
    }
}

export{Map};