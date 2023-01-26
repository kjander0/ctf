// The less oscillation the closer to server (maybe just run at server rate, and throttle decently if overtaking server. If we are too slow then we have missed inputs, but should catch up anyhow)
const SERVER_UPDATE_MS = 1000.0 / 30;
const CLIENT_UPDATE_MS = SERVER_UPDATE_MS - 0.25;
const THROTTLED_UPDATE_MS = SERVER_UPDATE_MS + 2;

export {SERVER_UPDATE_MS, CLIENT_UPDATE_MS, THROTTLED_UPDATE_MS};