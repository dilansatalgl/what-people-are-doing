const mongoose = require("mongoose");
const DmThread = require("../models/DmThread");
const User = require("../models/User");

const findThreadBetween = (userA, userB) =>
  DmThread.findOne({
    $or: [
      { initiator: userA, recipient: userB },
      { initiator: userB, recipient: userA },
    ],
  });

const serializeThread = (thread, viewerId) => {
  const viewerIsInitiator = thread.initiator.toString() === viewerId.toString();
  const otherUserIsAnonymous = viewerIsInitiator && !thread.recipientReplied;

  return {
    id: thread._id,
    initiator: thread.initiator,
    recipient: thread.recipient,
    recipientReplied: thread.recipientReplied,
    viewerIsInitiator,
    otherUserIsAnonymous,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
};

const createThread = async (req, res) => {
  try {
    const { recipientId } = req.body || {};

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Invalid recipient id" });
    }

    if (recipientId === req.user.userId) {
      return res.status(400).json({ message: "Cannot start a DM with yourself" });
    }

    const recipient = await User.findById(recipientId).select("_id");
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const existingThread = await findThreadBetween(req.user.userId, recipientId);
    if (existingThread) {
      return res.status(200).json({
        message: "Thread already exists",
        thread: serializeThread(existingThread, req.user.userId),
      });
    }

    try {
      const thread = await DmThread.create({
        initiator: req.user.userId,
        recipient: recipientId,
      });

      return res.status(201).json({
        message: "Thread created",
        thread: serializeThread(thread, req.user.userId),
      });
    } catch (error) {
      if (error && error.code === 11000) {
        const raceThread = await findThreadBetween(req.user.userId, recipientId);
        if (raceThread) {
          return res.status(200).json({
            message: "Thread already exists",
            thread: serializeThread(raceThread, req.user.userId),
          });
        }
      }
      throw error;
    }
  } catch (error) {
    return res.status(500).json({ message: "Failed to create DM thread" });
  }
};

const getThreadWithUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (userId === req.user.userId) {
      return res.status(400).json({ message: "Cannot fetch a DM with yourself" });
    }

    const thread = await findThreadBetween(req.user.userId, userId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    return res.status(200).json({
      thread: serializeThread(thread, req.user.userId),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch DM thread" });
  }
};

module.exports = {
  createThread,
  getThreadWithUser,
};
