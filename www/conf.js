let shared = null;
let UPDATE_MS;
let TILE_SIZE;
let PLAYER_SPEED;
let PLAYER_HEALTH;
let PLAYER_RADIUS;
let LASER_SPEED;
let LASER_TIME_TICKS;

async function retrieveConf()
{
    let promise = new Promise(function(resolve, reject) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onload = function() { 
             if (xmlHttp.status == 200) {
                shared = JSON.parse(xmlHttp.responseText);
                UPDATE_MS = 1000 / shared.TickRate;
                TILE_SIZE = shared.TileSize;
                PLAYER_SPEED = shared.PlayerSpeed;
                PLAYER_HEALTH = shared.PlayerHealth;
                PLAYER_RADIUS = shared.PlayerRadius;
                LASER_SPEED = shared.LaserSpeed;
                LASER_TIME_TICKS= shared.LaserTimeTicks;
                resolve();
                return;
            }
            reject("failed to retrieve shared config");
        }
        xmlHttp.open("GET", window.location.origin + '/shared.json', true); // true for asynchronous 
        xmlHttp.send(null);
    });
    return promise;
}

export {retrieveConf, UPDATE_MS, TILE_SIZE, PLAYER_SPEED, PLAYER_RADIUS, LASER_SPEED, LASER_TIME_TICKS};