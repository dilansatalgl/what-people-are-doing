const mongoose = require("mongoose");
const Echo = require("../models/Echo");
const Post = require("../models/Post");

const echoPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    await Echo.create({ user: userId, post: postId });

    const post = await Post.findOneAndUpdate(
      { _id: postId, expiresAt: { $gt: new Date() } },
      { $inc: { echoCount: 1 } },
      { returnDocument: "after" },
    );

    if (!post) {
      await Echo.deleteOne({ user: userId, post: postId });
      return res.status(404).json({ message: "Post not found or has expired." });
    }

    return res.status(201).json({ success: true, echoCount: post.echoCount });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already echoed this post." });
    }
    console.error("Echo post error:", error);
    return res.status(500).json({ message: "Failed to echo post." });
  }
};

const unechoPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const echo = await Echo.findOneAndDelete({ user: userId, post: postId });

    if (!echo) {
      return res.status(404).json({ message: "Echo not found." });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { echoCount: -1 } },
      { returnDocument: "after" },
    );

    return res.status(200).json({
      success: true,
      echoCount: Math.max(0, post?.echoCount ?? 0),
    });
  } catch (error) {
    console.error("Unecho post error:", error);
    return res.status(500).json({ message: "Failed to remove echo." });
  }
};

module.exports = { echoPost, unechoPost };
