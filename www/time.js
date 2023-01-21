function sleepMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Timer {
    constructor(periodSecs) {
        this.periodSecs = periodSecs;
        this.endTime = performance.now() + periodSecs * 1000;
    }

    rollover() {
        let diff = performance.now() - this.endTime;
        if (diff > 0) {
            this.endTime += this.periodSecs - diff;
            return true;
        } else {
            return false;
        }
    }
}

class Ticker {
    _frameTimeMs
    _cb
    constructor(tickRate, cb) {
        this._frameTimeMs = 1000.0 / tickRate;
        this._cb = cb;
    }

    async start() {
        let prevTime = performance.now() - this._frameTimeMs;
        let accumMs = 0;
        while (true) {
            let now = performance.now()
            let dt = now - prevTime;
            
            this._cb(dt / 1000.0);

            let spentTimeMs = performance.now() - prevTime;
            let sleepTimeMs = this._frameTimeMs + accumMs - spentTimeMs;
            await sleepMs(sleepTimeMs);
            spentTimeMs = performance.now() - prevTime;
            accumMs += this._frameTimeMs - spentTimeMs;

            prevTime = now;
        }
    }
}

export{sleepMs, Timer, Ticker};