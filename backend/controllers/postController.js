const Echo = require("../models/Echo");
const Post = require("../models/Post");
const { REACTION_TYPES } = require("../models/Reaction");
const User = require("../models/User");
const reverseGeocode = require("../utils/reverseGeocode");

const POST_COOLDOWN_MINUTES = 10;
const POST_COOLDOWN_MS = POST_COOLDOWN_MINUTES * 60 * 1000;

const buildReactionCounts = (stored) => {
  const counts = {};
  for (const type of REACTION_TYPES) {
    counts[type] = Math.max(0, stored?.[type] ?? 0);
  }
  return counts;
};

const formatPostHistoryItem = (post, now = new Date()) => ({
  postId: post._id,
  text: post.text,
  image: post.image,
  locationName: post.location?.name || null,
  coordinates: {
    longitude: post.location?.coordinates?.[0] ?? null,
    latitude: post.location?.coordinates?.[1] ?? null,
  },
  createdAt: post.createdAt,
  expiresAt: post.expiresAt,
  isActive: post.expiresAt > now,
  echoCount: post.echoCount ?? 0,
  reactionCounts: buildReactionCounts(post.reactionCounts),
});

const createPost = async (req, res) => {
  try {
    const { text = "", latitude, longitude } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Photo is required" });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Location is required" });
    }

    const trimmedText = text.trim();

    if (trimmedText.length > 280) {
      return res.status(400).json({ message: "Text cannot exceed 280 characters" });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "Invalid location coordinates" });
    }

    const existingActivePost = await Post.findOne({
        user: req.user.userId,
        expiresAt: { $gt: new Date() },
    });

    if (existingActivePost) {
      return res.status(409).json({
        message: "User already has an active post",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.lastPostCreatedAt) {
      const timeSinceLastPost = Date.now() - new Date(user.lastPostCreatedAt).getTime();

      if (timeSinceLastPost < POST_COOLDOWN_MS) {
        const remainingMs = POST_COOLDOWN_MS - timeSinceLastPost;
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        return res.status(429).json({
          message: "Please wait before creating another post",
          remainingSeconds,
        });
      }
    }

    let readableLocation = null;
    try {
      readableLocation = await reverseGeocode(lat, lng);
    } catch (error) {
      readableLocation = null;
    }

    const post = await Post.create({
      user: req.user.userId,
      text: trimmedText,
      image: `/uploads/${req.file.filename}`,
      location: {
        type: "Point",
        coordinates: [lng, lat],
        name: readableLocation,
      },
    });
    user.lastPostCreatedAt = new Date();
    await user.save();

    return res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Post creation failed",
    });
  }
};

const getMyPostHistory = async (req, res) => {
  try {
    const now = new Date();
    const posts = await Post.find({
      user: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts: posts.map((post) => formatPostHistoryItem(post, now)),
    });
  } catch (error) {
    console.error("Get post history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load post history.",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "You can only delete your own post",
      });
    }

    await Echo.deleteMany({ post: postId });
    await Post.findByIdAndDelete(postId);

    return res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Post deletion failed",
    });
  }
};

module.exports = {
  createPost,
  getMyPostHistory,
  deletePost,
};
