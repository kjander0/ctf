import { Tile } from "../map.js";
import * as assets from "../assets.js";

function getAlbedoTexture(tile) {
    switch (tile.type) {
        case Tile.EMPTY:
            return null;
        case Tile.FLOOR:
            return assets.getTexture("floor");
        case Tile.WALL:
            return assets.getTexture("wall");
        case Tile.WALL_TRIANGLE:
            return assets.getTexture("wall_triangle" + tile.orientation);
        case Tile.WALL_TRIANGLE_CORNER:
            return assets.getTexture("wall_triangle_corner" + tile.orientation);
        case Tile.GREEN_SPAWN:
            return assets.getTexture("green_spawn");
        case Tile.RED_SPAWN:
            return assets.getTexture("red_spawn");
        case Tile.GREEN_JAIL:
        case Tile.RED_JAIL:
            return assets.getTexture("jail");
    }
    throw "unkown tile type: " + tile.type;
}

function getNormalTexture(tile) {
    switch (tile.type) {
        case Tile.EMPTY:
            return null;
        case Tile.FLOOR:
            return assets.getTexture("floor_normal");
        case Tile.WALL:
            return assets.getTexture("wall_normal");
        case Tile.WALL_TRIANGLE:
            return assets.getTexture("wall_triangle_normal" + tile.orientation);
        case Tile.WALL_TRIANGLE_CORNER:
            return assets.getTexture("wall_triangle_corner_normal" + tile.orientation);
        case Tile.GREEN_SPAWN:
            return assets.getTexture("green_spawn_normal");
        case Tile.RED_SPAWN:
            return assets.getTexture("red_spawn_normal");
        case Tile.GREEN_JAIL:
        case Tile.RED_JAIL:
            return assets.getTexture("jail_normal");
    }
    throw "unkown tile type: " + tile.type;
}

export {
    getAlbedoTexture,
    getNormalTexture
};