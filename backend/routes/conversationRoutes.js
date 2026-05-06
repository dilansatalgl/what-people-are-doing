const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getUnreadCount,
  markConversationRead,
  getConversation,
  createConversation,
  sendMessage,
  listConversations,
} = require("../controllers/conversationController");

router.get("/unread-count", authMiddleware, getUnreadCount);
router.get("/", authMiddleware, listConversations);
router.post("/", authMiddleware, createConversation);
router.get("/:conversationId", authMiddleware, getConversation);
router.post("/:conversationId/read", authMiddleware, markConversationRead);
router.post("/:conversationId/messages", authMiddleware, sendMessage);

module.exports = router;
