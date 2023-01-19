import * as graphics from "./graphics.js"

const MsgType = {
	INIT: "init",
	UPDATE: "update",
};

function onMessage(msg) {
    console.log("received")

    switch (msg.type) {
        case MsgType.UPDATE:
            
            break;
    }
}

function onUpdate(deltaSecs) {
    // move things about
}

window.onload = function() {
    const gfx = new graphics.Graphics(document.getElementById("canvas-div"));
    gfx.app.ticker.add(onUpdate);

    const token = sessionStorage.getItem('token');
    console.log(token);

    const ws = new WebSocket("ws://" + location.host + "/ws");
    ws.onopen = function(event) {
        const token = sessionStorage.getItem("token");
        ws.send(JSON.stringify({"type": MsgType.INIT, "token": token}));
    };

    ws.onmessage = function(event) {
        const msgObj = JSON.parse(event.data);
        onMessage(msgObj);
    }

    ws.onclose = function(event) {
        console.log("websocket closed");
        // TODO: redirect to auth page
    }

    
};