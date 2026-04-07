const express = require("express");
const { createPost, getFeed } = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/feed", getFeed);
router.post("/", createPost);

module.exports = router;
