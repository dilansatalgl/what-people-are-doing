const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getUnreadCount,
  markConversationRead,
  getConversation,
} = require("../controllers/conversationController");

router.get("/unread-count", authMiddleware, getUnreadCount);
router.get("/:conversationId", authMiddleware, getConversation);
router.post("/:conversationId/read", authMiddleware, markConversationRead);

module.exports = router;
