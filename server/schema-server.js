const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();

const apiDataList = [];

for (let index = 1; index < 1000; index++) {
  const data = {
    id: index,
    value: Math.random().toString(36).substring(7),
  };
  apiDataList.push(data);
}

router.get("/questions/:id", function (req, res) {
  const stream = fs.createReadStream(
    path.join(__dirname, `/schemas/questions/${req.params.id}.json`)
  );
  stream.on("open", function () {
    res.set("Content-Type", "application/json");
    stream.pipe(res);
  });
  stream.on("error", function () {
    res.set("Content-Type", "text/plain");
    res.status(404).end("Not found");
  });
});

router.get("/answers", function (req, res) {
  const stream = fs.createReadStream(
    path.join(__dirname, `/schemas/answers/${req.query.id}.json`)
  );
  stream.on("open", function () {
    res.set("Content-Type", "application/json");
    stream.pipe(res);
  });
  stream.on("error", function () {
    res.set("Content-Type", "text/plain");
    res.status(404).end("Not found");
  });
});

router.get("/fix-data/:prpId/:part", function (req, res) {
  const fixDataStr = fs.readFileSync(
    path.join(__dirname, "/schemas/data.json"),
    {
      encoding: "utf8",
    }
  );
  const fixData = JSON.parse(fixDataStr);
  res.json(fixData[req.params.prpId]);
});

router.get("/autocomplete", (req, res) => {
  if (req.query.term) {
    const term = req.query.term;
    const data = apiDataList.filter((x) => x.value.indexOf(term) > -1);
    res.json(data.filter((_, i) => i < 10));
  } else if (req.query.fixid) {
    const fixId = req.query.fixid;
    const data = apiDataList.find((x) => x.id == fixId);
    res.json(data);
  }
});

router.get("/lookup", (req, res) => {
  if (req.query.term) {
    const term = req.query.term;
    const data = apiDataList.filter((x) => x.value.indexOf(term) > -1);
    res.json(data.filter((_, i) => i < 10));
  } else if (req.query.fixid) {
    const fixId = req.query.fixid;
    const data = apiDataList.find((x) => x.id == fixId);
    res.json(data);
  }
});

router.post("/popup", (req, res) => {
  res.json({
    body: `<div>
   
    <label for="name">Name:</label>
    <input type="text" id="name" name="name" value="${
      req.body?.name || ""
    }"><br><br>
    
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" value="${
      req.body?.email || ""
    }"><br><br>
    <button onclick='onSubmit()'>submit</button>
    

    
 
  <script>
  // Third party function
  function onSubmit(){
    
    const values = {name:document.getElementById('name').value,email:document.getElementById('email').value}
    bcCallback(values)

  }
  // Our static function
  function bcCallback(values){
    window.parent.postMessage(JSON.stringify(values),"http://localhost:3000"  );
  }
  
  </script>
  </div>`,
  });
});

module.exports = router;
