import { Tile } from "../map.js";
import * as assets from "../assets.js";

function getAlbedoTexture(tile) {
    switch (tile.type) {
        case Tile.WALL:
            return assets.getTexture("wall");
        case Tile.WALL_TRIANGLE:
            return assets.getTexture("wall_triangle" + tile.orientation);
        case Tile.WALL_TRIANGLE_CORNER:
            return assets.getTexture("wall_triangle_corner" + tile.orientation);
        case Tile.EMPTY:
            return assets.getTexture("floor");
    }
    return null;
}

function getNormalTexture(tile) {
    switch (tile.type) {
        case Tile.WALL:
            return assets.getTexture("wall_normal");
        case Tile.WALL_TRIANGLE:
            return assets.getTexture("wall_triangle_normal" + tile.orientation);
        case Tile.WALL_TRIANGLE_CORNER:
            return assets.getTexture("wall_triangle_corner_normal" + tile.orientation);
        case Tile.EMPTY:
            return assets.getTexture("floor_normal");
    }
    return null;
}

export {
    getAlbedoTexture,
    getNormalTexture
};