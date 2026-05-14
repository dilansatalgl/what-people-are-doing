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
  getThreadWithUser,
} = require("../controllers/conversationController");

router.get("/unread-count", authMiddleware, getUnreadCount);
router.get("/threads", authMiddleware, listConversations);
router.post("/threads", authMiddleware, createConversation);
router.get("/threads/with/:userId", authMiddleware, getThreadWithUser);
router.get("/threads/:conversationId", authMiddleware, getConversation);
router.post("/threads/:conversationId/read", authMiddleware, markConversationRead);
router.post("/threads/:conversationId/messages", authMiddleware, sendMessage);

module.exports = router;
