import * as assets from "./assets.js";

let UPDATE_MS;
let TILE_SIZE;
let PLAYER_SPEED;
let PLAYER_HEALTH;
let PLAYER_ENERGY;
let PLAYER_RADIUS;
let LASER_SPEED;
let LASER_TIME_TICKS;
let LASER_ENERGY_COST;
let BOUNCY_SPEED;

async function retrieveConf()
{
    let text = await assets.requestText('shared.json');
    let config = JSON.parse(text);
    UPDATE_MS = 1000 / config.TickRate;
    TILE_SIZE = config.TileSize;
    PLAYER_SPEED = config.PlayerSpeed;
    PLAYER_HEALTH = config.PlayerHealth;
    PLAYER_ENERGY = config.PlayerEnergy;
    PLAYER_RADIUS = config.PlayerRadius;
    LASER_SPEED = config.LaserSpeed;
    LASER_TIME_TICKS= config.LaserTimeTicks;
    LASER_ENERGY_COST = config.LaserEnergyCost;
    BOUNCY_SPEED = config.BouncySpeed;
}

export {
    retrieveConf,
    UPDATE_MS,
    TILE_SIZE,
    PLAYER_SPEED,
    PLAYER_HEALTH,
    PLAYER_ENERGY,
    PLAYER_RADIUS,
    LASER_SPEED,
    LASER_TIME_TICKS,
    LASER_ENERGY_COST,
    BOUNCY_SPEED,
};