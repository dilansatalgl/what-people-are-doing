const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { MAX_MESSAGE_LENGTH } = require("../models/Message");
const Post = require("../models/Post");

const DEFAULT_MESSAGE_PAGE_SIZE = 30;
const MAX_MESSAGE_PAGE_SIZE = 100;
const DEFAULT_THREAD_PAGE_SIZE = 30;
const MAX_THREAD_PAGE_SIZE = 100;
const MESSAGE_PREVIEW_LENGTH = 200;

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

// POST /api/conversations  body: { postId }
const createConversation = async (req, res) => {
  try {
    const { postId } = req.body || {};
    const userId = req.user.userId;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await Post.findById(postId).select("user");
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (post.user.toString() === userId) {
      return res
        .status(400)
        .json({ message: "Cannot start a conversation on your own post." });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { post: post._id, initiator: userId },
      {
        $setOnInsert: {
          post: post._id,
          creator: post.user,
          initiator: userId,
          creatorRevealed: false,
          unreadByCreator: 0,
          unreadByInitiator: 0,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      conversation: {
        id: conversation._id,
        postId: conversation.post,
        viewerRole: "initiator",
        otherPartyName: conversation.creatorRevealed ? null : "Anonymous",
        creatorRevealed: conversation.creatorRevealed,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadByInitiator,
      },
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create conversation.",
    });
  }
};

// POST /api/conversations/:conversationId/messages  body: { text }
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const rawText = (req.body?.text ?? "").toString();
    const text = rawText.trim();

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID." });
    }

    if (!text) {
      return res.status(400).json({ message: "Message text is required." });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return res
        .status(400)
        .json({ message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters.` });
    }

    const conversation = await Conversation.findById(conversationId).select(
      "creator initiator creatorRevealed"
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const role = getViewerRole(conversation, userId);
    if (!role) {
      return res.status(403).json({ message: "Not a participant." });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: userId,
      text,
    });

    const recipientUnreadField =
      role === "creator" ? "unreadByInitiator" : "unreadByCreator";

    const update = {
      $inc: { [recipientUnreadField]: 1 },
      $set: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: text.slice(0, MESSAGE_PREVIEW_LENGTH),
      },
    };

    if (role === "creator" && !conversation.creatorRevealed) {
      update.$set.creatorRevealed = true;
    }

    await Conversation.updateOne({ _id: conversation._id }, update);

    return res.status(201).json({
      success: true,
      message: {
        id: message._id,
        text: message.text,
        sentByViewer: true,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message.",
    });
  }
};

// GET /api/conversations?before=<ISO>&limit=<n>
const listConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const limitRaw = Number(req.query.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.floor(limitRaw), MAX_THREAD_PAGE_SIZE)
        : DEFAULT_THREAD_PAGE_SIZE;

    const filter = {
      $or: [{ creator: userId }, { initiator: userId }],
    };

    if (req.query.before) {
      const beforeDate = new Date(req.query.before);
      if (Number.isNaN(beforeDate.getTime())) {
        return res.status(400).json({ message: "Invalid 'before' timestamp." });
      }
      filter.lastMessageAt = { $lt: beforeDate };
    }

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("creator", "username")
      .populate("initiator", "username")
      .lean();

    const hasMore = conversations.length > limit;
    const page = hasMore ? conversations.slice(0, limit) : conversations;

    const threads = page.map((c) => {
      const viewerIsCreator = c.creator?._id?.toString() === req.user.userId;
      const role = viewerIsCreator ? "creator" : "initiator";
      let otherPartyName;
      if (viewerIsCreator) {
        otherPartyName = c.initiator?.username || null;
      } else if (!c.creatorRevealed) {
        otherPartyName = "Anonymous";
      } else {
        otherPartyName = c.creator?.username || null;
      }

      return {
        id: c._id,
        postId: c.post,
        viewerRole: role,
        otherPartyName,
        creatorRevealed: c.creatorRevealed,
        lastMessagePreview: c.lastMessagePreview || "",
        lastMessageAt: c.lastMessageAt,
        unreadCount: viewerIsCreator ? c.unreadByCreator : c.unreadByInitiator,
      };
    });

    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last?.lastMessageAt
        ? new Date(last.lastMessageAt).toISOString()
        : null;

    return res.status(200).json({
      success: true,
      threads,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("List conversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load conversations.",
    });
  }
};

module.exports = {
  getUnreadCount,
  markConversationRead,
  getConversation,
  createConversation,
  sendMessage,
  listConversations,
};
