const WebSocket = require("ws");

const MergeType = {
  replace: 0,
  append: 1,
};

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
      mergeType: MergeType.replace,
      isEnd: false,
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

let userId = 1000;
setInterval(() => {
  userId++;
  const data = {
    "user.list": {
      mergeType: MergeType.append,
      isEnd: false,
      data: [
        {
          id: userId,
          age: Math.floor(Math.random() * 80) + 10,
          name: Math.random().toString(36).substring(7),
        },
      ],
    },
  };
  [...wss.clients]
    .filter((ws) => ws.typeEx === "/list")
    .forEach((ws) => ws.send(JSON.stringify(data)));
}, 2000);

wss.on("connection", function connection(ws, req) {
  ws.typeEx = req.url;
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });
});
