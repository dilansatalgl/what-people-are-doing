const express = require("express");
const router = express.Router();

const { createThread, getThreadWithUser } = require("../controllers/dmController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/threads", authMiddleware, createThread);
router.get("/threads/with/:userId", authMiddleware, getThreadWithUser);

module.exports = router;
