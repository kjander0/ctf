import * as assets from "./assets.js";

let UPDATE_MS;
let TILE_SIZE;
let PLAYER_SPEED;
let PLAYER_HEALTH;
let MAX_LASER_ENERGY;
let MAX_BOUNCY_ENERGY;
let PLAYER_RADIUS;
let LASER_SPEED;
let LASER_TIME_TICKS;
let LASER_ENERGY_COST;
let BOUNCY_ENERGY_COST;
let BOUNCY_SPEED;
let MAX_BOUNCES;

async function retrieveConf()
{
    let text = await assets.requestText('shared.json');
    let config = JSON.parse(text);
    UPDATE_MS = 1000 / config.TickRate;
    TILE_SIZE = config.TileSize;
    PLAYER_SPEED = config.PlayerSpeed;
    PLAYER_HEALTH = config.PlayerHealth;
    MAX_LASER_ENERGY = config.MaxLaserEnergy;
    MAX_BOUNCY_ENERGY = config.MaxBouncyEnergy;
    PLAYER_RADIUS = config.PlayerRadius;
    LASER_SPEED = config.LaserSpeed;
    LASER_TIME_TICKS= config.LaserTimeTicks;
    LASER_ENERGY_COST = config.LaserEnergyCost;
    BOUNCY_ENERGY_COST = config.BouncyEnergyCost;
    BOUNCY_SPEED = config.BouncySpeed;
    MAX_BOUNCES = config.MaxBounces;
}

export {
    retrieveConf,
    UPDATE_MS,
    TILE_SIZE,
    PLAYER_SPEED,
    PLAYER_HEALTH,
    MAX_LASER_ENERGY,
    MAX_BOUNCY_ENERGY,
    PLAYER_RADIUS,
    LASER_SPEED,
    LASER_TIME_TICKS,
    LASER_ENERGY_COST,
    BOUNCY_ENERGY_COST,
    BOUNCY_SPEED,
    MAX_BOUNCES,
};