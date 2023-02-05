class PredictionHistory {
    history = []
    lastAckedVal

    constructor(val) {
        this.val = val;
        this.lastAckedVal = val;
    }

    predict(val, tick) {
        this.history.push(new Prediction(val, false));
    }

    ack(val, tick) {
        for (let h of this.history) {
            if (!h.acked) {
                h.val = val;
                h.acked = true;
                this.lastAckedVal = val;
                return;
            }
        }
        this.history.push(new Prediction(val, true));
    }

    clearAcked() {
        let numAcked = 0;
        for (let p of this.history) {
            if (!p.acked) {
                break;
            }
            numAcked++;
        }
        this.history.splice(0, numAcked);
    }
}

class Prediction {
    val
    acked = false

    constructor(val, acked) {
        this.val = val;
        this.acked = acked;
    }
}