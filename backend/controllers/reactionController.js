const mongoose = require("mongoose");
const Reaction = require("../models/Reaction");
const { REACTION_TYPES } = require("../models/Reaction");
const Post = require("../models/Post");

const emptyCounts = () =>
  REACTION_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});

const buildCounts = (post) => {
  const counts = emptyCounts();
  const stored = post?.reactionCounts || {};
  for (const type of REACTION_TYPES) {
    counts[type] = Math.max(0, stored[type] ?? 0);
  }
  return counts;
};

const setReaction = async (req, res) => {
  try {
    const { postId } = req.params;
    const { type } = req.body || {};
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    if (!REACTION_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid reaction type." });
    }

    const existing = await Reaction.findOne({ user: userId, post: postId });

    if (existing && existing.type === type) {
      const post = await Post.findOne({ _id: postId, expiresAt: { $gt: new Date() } });
      if (!post) {
        return res.status(404).json({ message: "Post not found or has expired." });
      }
      return res.status(200).json({
        success: true,
        userReaction: type,
        reactionCounts: buildCounts(post),
      });
    }

    if (existing) {
      const oldType = existing.type;
      existing.type = type;
      await existing.save();

      const post = await Post.findOneAndUpdate(
        { _id: postId, expiresAt: { $gt: new Date() } },
        {
          $inc: {
            [`reactionCounts.${oldType}`]: -1,
            [`reactionCounts.${type}`]: 1,
          },
        },
        { new: true },
      );

      if (!post) {
        existing.type = oldType;
        await existing.save();
        return res.status(404).json({ message: "Post not found or has expired." });
      }

      return res.status(200).json({
        success: true,
        userReaction: type,
        reactionCounts: buildCounts(post),
      });
    }

    await Reaction.create({ user: userId, post: postId, type });

    const post = await Post.findOneAndUpdate(
      { _id: postId, expiresAt: { $gt: new Date() } },
      { $inc: { [`reactionCounts.${type}`]: 1 } },
      { new: true },
    );

    if (!post) {
      await Reaction.deleteOne({ user: userId, post: postId });
      return res.status(404).json({ message: "Post not found or has expired." });
    }

    return res.status(201).json({
      success: true,
      userReaction: type,
      reactionCounts: buildCounts(post),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Conflicting reaction update." });
    }
    console.error("Set reaction error:", error);
    return res.status(500).json({ message: "Failed to set reaction." });
  }
};

const removeReaction = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const reaction = await Reaction.findOneAndDelete({ user: userId, post: postId });

    if (!reaction) {
      return res.status(404).json({ message: "Reaction not found." });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { [`reactionCounts.${reaction.type}`]: -1 } },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      userReaction: null,
      reactionCounts: buildCounts(post),
    });
  } catch (error) {
    console.error("Remove reaction error:", error);
    return res.status(500).json({ message: "Failed to remove reaction." });
  }
};

module.exports = { setReaction, removeReaction };
