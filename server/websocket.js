const WebSocket = require("ws");

const MergeType = {
  replace: 0,
  append: 1,
};

const wss = new WebSocket.Server({ port: 8080 });

let timeCounter = 10;
setInterval(() => {
  const date = new Date();
  if (timeCounter > 0) {
    timeCounter--;
  }
  const data = {
    setting: {
      keepalive: timeCounter > 0,
    },
    sources: [
      {
        options: {
          tableName: "stream.time",
          mergeType: MergeType.replace,
        },
        data: [
          {
            hh: date.getHours(),
            mm: date.getMinutes(),
            ss: date.getSeconds(),
            remain: timeCounter,
          },
        ],
      },
    ],
  };
  [...wss.clients]
    .filter((ws) => ws.typeEx === "/time")
    .forEach((ws) => ws.send(JSON.stringify(data)));
}, 1000);

let timeRemainCounter = 0;
setInterval(() => {
  const date = new Date();
  if (timeRemainCounter > 0) {
    timeRemainCounter--;
  }
  const data = {
    setting: {
      keepalive: timeRemainCounter > 0,
    },
    sources: [
      {
        options: {
          tableName: "stream.time",
          mergeType: MergeType.replace,
        },
        data: [
          {
            hh: date.getHours(),
            mm: date.getMinutes(),
            ss: date.getSeconds(),
            remain: timeRemainCounter,
          },
        ],
      },
    ],
  };
  [...wss.clients]
    .filter((ws) => ws.typeEx === "/time-remain")
    .forEach((ws) => ws.send(JSON.stringify(data)));
}, 1000);

let userId = 1000;
setInterval(() => {
  userId++;
  const data = {
    sources: [
      {
        options: {
          tableName: "user.list",
          mergeType: MergeType.append,
        },
        data: [
          {
            id: userId,
            age: Math.floor(Math.random() * 80) + 10,
            name: Math.random().toString(36).substring(7),
          },
        ],
      },
    ],
  };
  [...wss.clients]
    .filter((ws) => ws.typeEx === "/list")
    .forEach((ws) => ws.send(JSON.stringify(data)));
}, 2000);

wss.on("connection", function connection(ws, req) {
  ws.typeEx = req.url;
  if (req.url == "/time") {
    timeCounter = 10;
  } else if (req.url == "/time-remain") {
    //timeRemainCounter = 10;
  }
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
    if (ws.typeEx == "/time-remain") {
      const data = JSON.parse(message);
      const result = /counter=["'](?<f>[^"']*)["']/i.exec(data.command);
      if (result) {
        const r = parseInt(result.groups.f);
        timeRemainCounter += r;
        console.log(
          "add %i to timeRemainCounter and extended to %i",
          r,
          timeRemainCounter
        );
      }
    }
  });
});
