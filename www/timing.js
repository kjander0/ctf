const TICK_RATE = 30.0;
const UPDATE_DT = 1.0 / TICK_RATE;

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
    constructor(tickRate) {
        this.frameTimeMs = 1000.0 / tickRate;
    }

    async start(cb) {
        let prevTime = performance.now() - this.frameTimeMs;
        let accumMs = 0;
        while (true) {
            let now = performance.now()
            let dt = now - prevTime;
            
            cb(dt / 1000.0);

            let spentTimeMs = performance.now() - prevTime;
            let sleepTimeMs = this.frameTimeMs + accumMs - spentTimeMs;
            await sleepMs(sleepTimeMs);
            spentTimeMs = performance.now() - prevTime;
            accumMs += this.frameTimeMs - spentTimeMs;

            prevTime = now;
        }
    }
}

export{TICK_RATE, UPDATE_DT, sleepMs, Timer, Ticker};