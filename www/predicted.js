
// Buffer of predicted values which can later be acked
class Predicted {
    unacked = []
    capacity

    constructor(capacity) {
        if (isNaN(capacity)) {
            throw "bad capacity parameter"
        }
        this.capacity = capacity;
    }

    predict(val, tick) {
        if (isNaN(tick)) {
            throw "bad tick parameter"
        }
        let len = this.unacked.push(new Prediction(val, tick));
        if (len > this.capacity) {
            console.log("prediction buffer full, dropping one");
            this.unacked.splice(0, 1);
        }
    }

    ack(tick) {
        if (isNaN(tick)) {
            throw "bad tick parameter"
        }
        let found = false;
        let numAcked = 0;
        for (let h of this.unacked) {
            if (h.tick === tick) {
                found = true;
                numAcked++;
                break;
            }
            numAcked++;
        }
        if (!found) {
            console.log("predicted not found: ", tick);
        }
        this.unacked.splice(0, numAcked);
        return numAcked;
    }
}

class Prediction {
    val
    tick

    constructor(val, tick) {
        this.val = val;
        this.tick = tick;
    }
}

export {Predicted};