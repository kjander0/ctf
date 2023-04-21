import * as conf from "./conf.js"
import { Vec } from "./math.js"

class Tile {
    static EMPTY = 0;
    static WALL = 1;
    static GREEN_JAIL = 2;
    static RED_JAIL = 3;
    static GREEN_SPAWN = 4;
    static RED_SPAWN = 5;
    //  /\
    // /__\
    static WALL_TRIANGLE = 6;
    // |\
    // |_\
    static WALL_TRIANGLE_CORNER = 7;
    static FLAG_SPAWN = 8;
    static GREEN_FLAG_GOAL = 9;
    static RED_FLAG_GOAL = 10;


    type = null;
    pos = null;

    // CCW orientation of base of triangle tiles
	//   2
	// 3 /\ 1
	//   0
    orientation = 0;

    constructor(type, pos) {
        this.type = type;
        this.pos = pos;
    }

    setTrianglePoints(p0, p1, p2) {
        if (this.type === Tile.WALL_TRIANGLE) {
            switch (this.orientation) {
                case 0:
                    p0.set(this.pos);
                    p1.set(this.pos.addXY(conf.TILE_SIZE, 0));
                    p2.set(this.pos.addXY(conf.TILE_SIZE/2, conf.TILE_SIZE/2));
                    break;
                case 1:
                    p0.set(this.pos.addXY(conf.TILE_SIZE, 0));
                    p1.set(this.pos.addXY(conf.TILE_SIZE, conf.TILE_SIZE));
                    p2.set(this.pos.addXY(conf.TILE_SIZE/2, conf.TILE_SIZE/2));
                    break;
                case 2:
                    p0.set(this.pos.addXY(conf.TILE_SIZE, conf.TILE_SIZE));
                    p1.set(this.pos.addXY(0, conf.TILE_SIZE));
                    p2.set(this.pos.addXY(conf.TILE_SIZE/2, conf.TILE_SIZE/2));
                    break;
                case 3:
                    p0.set(this.pos.addXY(0, conf.TILE_SIZE));
                    p1.set(this.pos);
                    p2.set(this.pos.addXY(conf.TILE_SIZE/2, conf.TILE_SIZE/2));
                    break;
            }
        } else if (this.type === Tile.WALL_TRIANGLE_CORNER) {
            switch (this.orientation) {
                case 0:
                    p0.set(this.pos);
                    p1.set(this.pos.addXY(conf.TILE_SIZE, 0));
                    p2.set(this.pos.addXY(0, conf.TILE_SIZE));
                    break;
                case 1:
                    p0.set(this.pos.addXY(conf.TILE_SIZE, 0));
                    p1.set(this.pos.addXY(conf.TILE_SIZE, conf.TILE_SIZE));
                    p2.set(this.pos);
                    break;
                case 2:
                    p0.set(this.pos.addXY(conf.TILE_SIZE, conf.TILE_SIZE));
                    p1.set(this.pos.addXY(0, conf.TILE_SIZE));
                    p2.set(this.pos.addXY(conf.TILE_SIZE, 0));
                    break;
                case 3:
                    p0.set(this.pos.addXY(0, conf.TILE_SIZE));
                    p1.set(this.pos);
                    p2.set(this.pos.addXY(conf.TILE_SIZE, conf.TILE_SIZE));
                    break;
            }
        } else {
            throw "not a triangle tile";
        }
    }
}

function isSolidType(type) {
    return type === Tile.WALL || type === Tile.WALL_TRIANGLE || type === Tile.WALL_TRIANGLE_CORNER;
}

class Map {
    tileRows = [];
    numFlags = 0;

    constructor(rows) {
        for (let r = 0; r < rows.length; r++) {
            this.tileRows.push([]);
            for (let c = 0; c < rows[r].length; c++) {
                const tile = new Tile(rows[r][c], new Vec(c, r).scale(conf.TILE_SIZE));
                switch (tile.type) {
                    case Tile.WALL_TRIANGLE:
                    case Tile.WALL_TRIANGLE_CORNER:
                        tile.orientation = this._findTriangleOrientation(rows, r, c);
                        break;
                    case Tile.FLAG_SPAWN:
                        this.numFlags++;
                        break;
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
                if (!isSolidType(tile.type)) {
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
            return isSolidType(rows[ri][ci]);
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
            if (left) {
                return 3
            }
            return 2;
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