const express = require("express");
const { google_login } = require("../controller/auth.controller.js");

const router = express.Router();

router.post("/google", google_login);

module.exports = router;
