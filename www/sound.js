const laser = PIXI.sound.Sound.from({
    url: 'assets/laser.wav',
    preload: true,
});

const bouncy = PIXI.sound.Sound.from({
    url: 'assets/bouncy.wav',
    preload: true,
});

const hit = PIXI.sound.Sound.from({
    url: 'assets/hit.wav',
    preload: true,
});

export {
    laser,
    bouncy,
    hit,
};