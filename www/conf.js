let shared = null;
let UPDATE_MS;
let PLAYER_SPEED;
let LASER_SPEED;

async function retrieveConf()
{
    let promise = new Promise(function(resolve, reject) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onload = function() { 
             if (xmlHttp.status == 200) {
                shared = JSON.parse(xmlHttp.responseText);
                UPDATE_MS = 1000 / shared.TickRate;
                PLAYER_SPEED = shared.PlayerSpeed;
                LASER_SPEED = shared.LaserSpeed;
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

export {retrieveConf, UPDATE_MS, PLAYER_SPEED, LASER_SPEED};