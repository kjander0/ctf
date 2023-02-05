// TODO limit number of predictions
class Predicted {
    unacked= []

    predict(val, tick) {
        this.unacked.push(new Prediction(val, tick));
    }

    ack(tick) {
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