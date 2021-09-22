const express = require("express");
const router = express.Router();

router.post("/api/*.json", function (req, res) {
  res.send(`{ "a": "12", "e": "ali" ,"k":12}`);
});

router.post("*", (req, res) => {
  res.redirect(req.originalUrl);
});

module.exports = router;
