const express = require("express");
const router = express.Router();
router.use(express.json({ limit: "20mb" }));

router.post("/answer-json", function (req, res) {
  res.json({
    errorid: 4,
    message: "successful",
    usedforid: "sample-returnObject",
  });
});

router.post("/answer-blob", function (req, res) {
  res.json({ status: "ok" });
});

module.exports = router;
