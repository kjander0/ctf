import * as conf from "./conf.js"
import * as assets from "./assets.js"
import { Vec } from "./math.js"

class TileType {
    static EMPTY;
    static FLOOR;
    static WALL;
    //  /\
    // /__\
    static WALL_TRIANGLE;
    // |\
    // |_\
    static WALL_TRIANGLE_CORNER;

    static GREEN_SPAWN;
    static RED_SPAWN;
    static YELLOW_SPAWN;
    static BLUE_SPAWN;

    static GREEN_JAIL;
    static RED_JAIL;
    static YELLOW_JAIL;
    static BLUE_JAIL;

    static GREEN_FLAG_GOAL;
    static RED_FLAG_GOAL;
    static YELLOW_FLAG_GOAL;
    static BLUE_FLAG_GOAL;

    static FLAG_SPAWN;

    static nextId = 0;
    static typeList = [];

    id; // corresponds to tile id in map files

    // Collision Info
    collisionShape = null;

    // Render info
    albedoTextures = null; // [orientation][variation]
    normalTextures = null; // [orientation][variation]
    drawSize = new Vec(conf.TILE_SIZE, conf.TILE_SIZE);
    onFloor = true;

    constructor() {
        this.id = TileType.nextId++;
        TileType.typeList.push(this);
    }

    static fromId(id) {
        return TileType.typeList[id];
    }
}

// ========== BEGIN TILE TYPE DEFINITIONS ==========
// NOTE: this needs to be called after texture assets have been loaded
function defineTileTypes() {
    if (TileType.typeList.length > 0) {
        throw "Tile types already defined";
    }

    TileType.EMPTY = new TileType();
    TileType.EMPTY.onFloor = false;

    TileType.FLOOR = new TileType();
    TileType.FLOOR.onFloor = false;
    TileType.FLOOR.albedoTextures = _mapTextures("floor");
    TileType.FLOOR.normalTextures = _mapTextures("floor_normal");
    
    TileType.WALL = new TileType();
    TileType.WALL.albedoTextures = _mapTextures("wall");
    TileType.WALL.normalTextures = _mapTextures("wall_normal");
    
    TileType.WALL_TRIANGLE = new TileType();
    TileType.WALL_TRIANGLE.albedoTextures = _mapTextures("wall_triangle", 4);
    TileType.WALL_TRIANGLE.normalTextures = _mapTextures("wall_triangle_normal", 4);
    
    TileType.WALL_TRIANGLE_CORNER = new TileType();
    TileType.WALL_TRIANGLE_CORNER.albedoTextures = _mapTextures("wall_triangle_corner", 4);
    TileType.WALL_TRIANGLE_CORNER.normalTextures = _mapTextures("wall_triangle_corner_normal", 4);
    
    TileType.GREEN_SPAWN = new TileType();
    TileType.GREEN_SPAWN.albedoTextures = _mapTextures("green_spawn");
    TileType.GREEN_SPAWN.normalTextures = _mapTextures("spawn_normal");
    
    TileType.RED_SPAWN = new TileType();
    TileType.RED_SPAWN.albedoTextures = _mapTextures("red_spawn");
    TileType.RED_SPAWN.normalTextures = _mapTextures("spawn_normal");

    TileType.BLUE_SPAWN = new TileType();
    //TileType.BLUE_SPAWN.albedoTextures = _mapTextures("blue_spawn");
    //TileType.BLUE_SPAWN.normalTextures = _mapTextures("spawn_normal");
    
    TileType.YELLOW_SPAWN = new TileType();
    //TileType.YELLOW_SPAWN.albedoTextures = _mapTextures("yellow_spawn");
    //TileType.YELLOW_SPAWN.normalTextures = _mapTextures("spawn_normal");
    
    TileType.GREEN_JAIL = new TileType();
    TileType.GREEN_JAIL.onFloor = false;
    TileType.GREEN_JAIL.albedoTextures = _mapTextures("jail");
    TileType.GREEN_JAIL.normalTextures = _mapTextures("jail_normal");
    
    TileType.RED_JAIL = new TileType();
    TileType.RED_JAIL.onFloor = false;
    TileType.RED_JAIL.albedoTextures = _mapTextures("jail");
    TileType.RED_JAIL.normalTextures = _mapTextures("jail_normal");

    TileType.BLUE_JAIL = new TileType();
    TileType.BLUE_JAIL.onFloor = false;
    //TileType.BLUE_JAIL.albedoTextures = _mapTextures("jail");
    //TileType.BLUE_JAIL.normalTextures = _mapTextures("jail_normal");
    
    TileType.YELLOW_JAIL = new TileType();
    TileType.YELLOW_JAIL.onFloor = false;
    //TileType.YELLOW_JAIL.albedoTextures = _mapTextures("jail");
    //TileType.YELLOW_JAIL.normalTextures = _mapTextures("jail_normal");
    
    TileType.GREEN_FLAG_GOAL = new TileType();
    TileType.GREEN_FLAG_GOAL.albedoTextures = _mapTextures("green_flag_goal");
    TileType.GREEN_FLAG_GOAL.normalTextures = _mapTextures("flag_goal_normal");
    
    TileType.RED_FLAG_GOAL = new TileType();
    TileType.RED_FLAG_GOAL.albedoTextures = _mapTextures("red_flag_goal");
    TileType.RED_FLAG_GOAL.normalTextures = _mapTextures("flag_goal_normal");

    TileType.BLUE_FLAG_GOAL = new TileType();
    //TileType.BLUE_FLAG_GOAL.albedoTextures = _mapTextures("blue_flag_goal");
    //TileType.BLUE_FLAG_GOAL.normalTextures = _mapTextures("flag_goal_normal");
    
    TileType.YELLOW_FLAG_GOAL = new TileType();
    //TileType.YELLOW_FLAG_GOAL.albedoTextures = _mapTextures("yellow_flag_goal");
    //TileType.YELLOW_FLAG_GOAL.normalTextures = _mapTextures("flag_goal_normal");
    
    TileType.FLAG_SPAWN = new TileType();
    TileType.FLAG_SPAWN.albedoTextures = _mapTextures("flag_spawn");
    TileType.FLAG_SPAWN.normalTextures = _mapTextures("flag_goal_normal");
}

function _mapTextures(name, orientations=1, variations=1) {
    const mapping = [];
    for (let o = 0; o < orientations; o++) {
        mapping.push([]);
        for (let v = 0; v < variations; v++) {
            const texName = name + '_' + o + '_' + v;
            mapping[o].push(assets.getTexture(texName));
        }
    }
    return mapping;
}
// ========== END TILE TYPE DEFINITIONS ==========

class Tile {
    type = null;

    // CCW orientation. e.g. for base of triangle tiles
	//   2
	// 3 /\ 1
	//   0
    orientation = 0;

    pos;

    constructor(type, row, col) {
        this.type = type;
        this.pos = posFromRowCol(row, col);
    }

    setTrianglePoints(p0, p1, p2) {
        if (this.type === TileType.WALL_TRIANGLE) {
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
        } else if (this.type === TileType.WALL_TRIANGLE_CORNER) {
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

    getAlbedoTexture() {
        if (this.type.albedoTextures === null) {
            return null;
        }
        if (this.type.albedoTextures.length === 1) {
            return this.type.albedoTextures[0][0];
        }
        return this.type.albedoTextures[this.orientation][0];
    }

    getNormalTexture() {
        if (this.type.normalTextures === null) {
            return null;
        }
        if (this.type.normalTextures.length === 1) {
            return this.type.normalTextures[0][0];
        }
        return this.type.normalTextures[this.orientation][0];
    }
}

function _isSolidType(type) {
    return type === TileType.WALL || type === TileType.WALL_TRIANGLE || type === TileType.WALL_TRIANGLE_CORNER;
}

function posFromRowCol(row, col) {
    return new Vec(col * conf.TILE_SIZE, row * conf.TILE_SIZE);
}

class Map {
    tileRows = [];
    numFlags = 0;

    constructor(rows) {
        for (let r = 0; r < rows.length; r++) {
            this.tileRows.push([]);
            for (let c = 0; c < rows[r].length; c++) {
                const typeId = rows[r][c];
                const tileType = TileType.fromId(typeId);
                console.log("tile type: ", tileType);
                const tile = new Tile(tileType, r, c);
                switch (tileType) {
                    case TileType.WALL_TRIANGLE:
                    case TileType.WALL_TRIANGLE_CORNER:
                        tile.orientation = 0;
                        break;
                    case TileType.FLAG_SPAWN:
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
                if (!_isSolidType(tile.type)) {
                    continue;
                }
                samples.push(tile);
            }
        }
        return samples;
    }
}

export{Tile, TileType, Map, defineTileTypes, posFromRowCol};