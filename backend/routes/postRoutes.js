const express = require("express");
const router = express.Router();
const multer = require("multer");

const { createPost, deletePost } = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { getRandomFeed } = require("../controllers/feedController");
const feedRateLimiter = require("../middleware/feedRateLimiter");

router.post("/", authMiddleware, (req, res, next) => {
  upload.single("image")(req, res, function (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "Image size exceeds the allowed limit",
        });
      }

      return res.status(400).json({
        message: error.message,
      });
    }

    if (error) {
      return res.status(400).json({
        message: error.message || "File upload failed",
      });
    }

    next();
  });
}, createPost);

router.delete("/:postId", authMiddleware, deletePost);
router.get("/feed", authMiddleware, feedRateLimiter, getRandomFeed);

module.exports = router;