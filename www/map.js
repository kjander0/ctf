import * as conf from "./conf.js"
import { Vec } from "./math.js"

class Tile {
    static EMPTY = 0;
    static WALL = 1;
    static JAIL = 2;
    static SPAWN = 3;
    //  /\
    // /__\
    static WALL_TRIANGLE = 4;
    // |\
    // |_\
    static WALL_TRIANGLE_CORNER = 5;

    type = null;
    pos = null;
    orientation = 0; // 4 orientations of triangle tiles

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
                const tile = new Tile(rows[r][c], new Vec(c, r).scale(conf.TILE_SIZE));
                if (tile.type === Tile.WALL_TRIANGLE) {
                    tile.orientation = _findTriangleOrientation(rows, r, c);
                }
                this.tileRows[r].push(tile);
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

    _findTriangleOrientation(rows, r, c) {
        function isWall(ri, ci) {
            if (ri < 0 || ri >= rows.length) {
                return false;
            }
            if (ci < 0 || ci >= rows[ri].length) {
                return false;
            }
            return rows[ri][ci] === Tile.WALL;
        }

        const left = isWall(r, c-1);
        const right = isWall(r, c+1);
        const above = isWall(r+1, c);
        const below = isWall(r-1, c);

        if (below) {
            if (right) {
                return 1;
            }
            return 0;
        }

        if (above) {
            if (right) {
                return 2
            }
            return 3;
        }

        if (right) {
            return 1;
        }

        if (left) {
            return 3;
        }

        return 0;
    }
}

export{Tile, Map};