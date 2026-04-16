const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { signup, login, deleteAccount } = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);
router.delete("/account", authMiddleware, deleteAccount);

module.exports = router;
