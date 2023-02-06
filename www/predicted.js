// TODO limit number of predictions
class Predicted {
    unacked= []
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
        this.unacked.push(new Prediction(val, tick));
        if (this.unacked.length > this.capacity) {
            console.log("prediction buffer full, dropping one");
            this.unacked.splice(0, 1);
        }
    }

    ack(tick) {
        if (isNaN(tick)) {
            throw "bad tick parameter"
        }
        let numAcked = 0;
        for (let h of this.unacked) {
            if (h.tick === tick) {
                numAcked++;
                break;
            }
            numAcked++;
        }
        this.unacked.splice(0, numAcked);
        return numAcked;
    }

    lastTickOrNull() {
        if (this.unacked.length > 0) {
            return this.unacked[this.unacked.length-1].tick;
        }
        return null;
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