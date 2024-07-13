const express = require("express");
const path = require("path");
const router = express.Router();
router.use(express.json());

console.log("path.join(__dirname, 'assets')", path.join(__dirname, 'assets'))

router.use(express.static(path.join(__dirname, 'assets')))

module.exports = router;
