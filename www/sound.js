const laser = new Audio('assets/laser.wav');
const bouncy = new Audio('assets/bouncy.wav');
const hit = new Audio('assets/hit.wav');

function playLaser() {
    laser.cloneNode(true).play();
}

function playBouncy() {
    bouncy.cloneNode(true).play();
}

function playHit() {
    hit.cloneNode(true).play();
}

// TODO: cloneNode(true) and play new instance of sound
export {
    playLaser,
    playBouncy,
    playHit,
};