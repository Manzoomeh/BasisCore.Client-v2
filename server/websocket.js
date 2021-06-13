const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const connections = [];

setInterval(
  () =>
    connections.forEach((ws) => ws.send(JSON.stringify({ id: 1, data: "hi" }))),
  1000
);
wss.on("connection", function connection(ws) {
  connections.push(ws);
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });

  //ws.send("something");
});
