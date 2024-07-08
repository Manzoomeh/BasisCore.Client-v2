const http = require("http");

let id = 0;
function generateRandomData() {
  return {
    sources: [
      {
        options: {
          tableName: "user.list",
          mergeType: 1,
        },
        data: [
          {
            id: id++,
            age: Math.floor(Math.random() * 80) + 10,
            name: Math.random().toString(36).substring(7),
          },
        ],
      },
    ],
  };
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });

  const interval = setInterval(() => {
    const chunk = JSON.stringify(generateRandomData()) + "\n";
    res.write(chunk);
    console.log("Chunk sent:", chunk);
  }, 1000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
    console.log("Connection closed, stopped sending chunks.");
  });
});

server.listen(2020, () => {
  console.log("Server is listening on port 2020");
});
