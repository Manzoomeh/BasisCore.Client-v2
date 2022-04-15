const express = require("express");
const router = express.Router();
router.use(express.json());

router.post("/token", function (req, res) {
  setTimeout(() => {
    res.json({
      token: Math.random().toString(36).substring(7),
      Captcha: false,
      Captcha_id: null,
    });
  }, 3000);
});

router.post("/token-result", function (req, res) {
  res.json(req.body);
});

router.post("/*.json", function (req, res) {
  res.send(`{ "a": "12", "e": "ali" ,"k":12}`);
});

router.post("*", (req, res) => {
  res.redirect(req.originalUrl);
});

module.exports = router;
