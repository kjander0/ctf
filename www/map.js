import * as conf from "./conf.js"
import { Vec } from "./math.js"

class Tile {
    static EMPTY = 0;
    static FLOOR = 1;
    static WALL = 2;
    //  /\
    // /__\
    static WALL_TRIANGLE = 3;
    // |\
    // |_\
    static WALL_TRIANGLE_CORNER = 4;

    static GREEN_SPAWN = 10;
    static RED_SPAWN = 11;
    static YELLOW_SPAWN = 12;
    static BLUE_SPAWN = 13;

    static GREEN_JAIL = 14;
    static RED_JAIL = 15;
    static YELLOW_JAIL = 16;
    static BLUE_JAIL = 17;

    static GREEN_FLAG_GOAL = 18;
    static RED_FLAG_GOAL = 19;
    static YELLOW_FLAG_GOAL = 20;
    static BLUE_FLAG_GOAL = 21;

    static FLAG_SPAWN = 30;

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
                        tile.orientation = 0;
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
}

export{Tile, Map};