const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const DEFAULT_MESSAGE_PAGE_SIZE = 30;
const MAX_MESSAGE_PAGE_SIZE = 100;

const getViewerRole = (conversation, userId) => {
  if (conversation.creator.toString() === userId) return "creator";
  if (conversation.initiator.toString() === userId) return "initiator";
  return null;
};

const resolveOtherPartyDisplay = (conversation, viewerRole) => {
  // viewer is the creator -> the other party is the initiator (always shown by username)
  if (viewerRole === "creator") {
    return conversation.initiator?.username || null;
  }
  // viewer is the initiator -> the other party is the creator (anonymous until revealed)
  if (!conversation.creatorRevealed) {
    return "Anonymous";
  }
  return conversation.creator?.username || null;
};

// GET /api/conversations/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const [result] = await Conversation.aggregate([
      {
        $match: {
          $or: [{ creator: userId }, { initiator: userId }],
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ["$creator", userId] },
                "$unreadByCreator",
                "$unreadByInitiator",
              ],
            },
          },
          threadsWithUnread: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $cond: [
                        { $eq: ["$creator", userId] },
                        "$unreadByCreator",
                        "$unreadByInitiator",
                      ],
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      unreadCount: result?.total ?? 0,
      threadsWithUnread: result?.threadsWithUnread ?? 0,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load unread count.",
    });
  }
};

// POST /api/conversations/:conversationId/read
const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID." });
    }

    const conversation = await Conversation.findById(conversationId).select(
      "creator initiator"
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const role = getViewerRole(conversation, userId);
    if (!role) {
      return res.status(403).json({ message: "Not a participant." });
    }

    const field = role === "creator" ? "unreadByCreator" : "unreadByInitiator";

    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { [field]: 0 } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark conversation read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark conversation as read.",
    });
  }
};

// GET /api/conversations/:conversationId?before=<ISO>&limit=<n>
const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID." });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate("creator", "username")
      .populate("initiator", "username")
      .populate("post", "_id");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const role = getViewerRole(conversation, userId);
    if (!role) {
      return res.status(403).json({ message: "Not a participant." });
    }

    const limitRaw = Number(req.query.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.floor(limitRaw), MAX_MESSAGE_PAGE_SIZE)
        : DEFAULT_MESSAGE_PAGE_SIZE;

    const messageQuery = { conversation: conversation._id };
    if (req.query.before) {
      const beforeDate = new Date(req.query.before);
      if (Number.isNaN(beforeDate.getTime())) {
        return res.status(400).json({ message: "Invalid 'before' timestamp." });
      }
      messageQuery.createdAt = { $lt: beforeDate };
    }

    // Fetch one extra to determine if there's another page available.
    const messages = await Message.find(messageQuery)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;
    const pageMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore
      ? pageMessages[pageMessages.length - 1].createdAt.toISOString()
      : null;

    const otherPartyName = resolveOtherPartyDisplay(conversation, role);

    return res.status(200).json({
      success: true,
      conversation: {
        id: conversation._id,
        postId: conversation.post?._id ?? conversation.post,
        viewerRole: role,
        otherPartyName,
        creatorRevealed: conversation.creatorRevealed,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount:
          role === "creator"
            ? conversation.unreadByCreator
            : conversation.unreadByInitiator,
      },
      messages: pageMessages.map((m) => ({
        id: m._id,
        text: m.text,
        sentByViewer: m.sender.toString() === userId,
        createdAt: m.createdAt,
      })),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load conversation.",
    });
  }
};

module.exports = {
  getUnreadCount,
  markConversationRead,
  getConversation,
};
