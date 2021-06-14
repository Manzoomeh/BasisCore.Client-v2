const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const p = {
  "book.list": {
    data: [
      { id: 1, BookName: "طراحی وبسایت", Price: 1400, Count: 4 },
      { id: 2, BookName: "تمدن", Price: 2300, Count: 3 },
    ],
  },
  "book.Type": {
    data: [
      { id: 1, Name: "وبسایت" },
      { id: 2, Name: "طراحی" },
    ],
  },
};
setInterval(() => {
  const date = new Date();
  const data = {
    "stream.time": {
      data: [
        {
          hh: date.getHours(),
          mm: date.getMinutes(),
          ss: date.getSeconds(),
        },
      ],
    },
  };
  [...wss.clients]
    .filter((ws) => ws.typeEx === "/time")
    .forEach((ws) => ws.send(JSON.stringify(data)));
}, 1000);

wss.on("connection", function connection(ws, req) {
  ws.typeEx = req.url;
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });
});
