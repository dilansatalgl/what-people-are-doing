const Post = require("../models/Post");
const User = require("../models/User");
const reverseGeocode = require("../utils/reverseGeocode");

const POST_COOLDOWN_MINUTES = 10;
const POST_COOLDOWN_MS = POST_COOLDOWN_MINUTES * 60 * 1000;


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

module.exports = {
  createPost,
};