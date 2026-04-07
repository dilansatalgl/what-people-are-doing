const Post = require("../models/Post");
const postExpiration = require("../config/postExpiration");

const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 100;

const parseFeedLimit = (value) => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return DEFAULT_FEED_LIMIT;
  }

  return Math.min(parsedValue, MAX_FEED_LIMIT);
};

const normalizeLocation = (location) => {
  if (!location || !Array.isArray(location.coordinates)) {
    return null;
  }

  if (location.coordinates.length !== 2) {
    return null;
  }

  const [longitude, latitude] = location.coordinates.map(Number);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return null;
  }

  const name =
    typeof location.name === "string" && location.name.trim()
      ? location.name.trim()
      : null;

  return {
    coordinates: [longitude, latitude],
    name,
  };
};

const createPost = async (req, res) => {
  try {
    const trimmedText =
      typeof req.body.text === "string" ? req.body.text.trim() : "";
    const image =
      typeof req.body.image === "string" && req.body.image.trim()
        ? req.body.image.trim()
        : null;
    const location = normalizeLocation(req.body.location);

    if (!trimmedText) {
      return res.status(400).json({ message: "Post text is required." });
    }

    if (!location) {
      return res.status(400).json({
        message:
          "Location must include valid [longitude, latitude] coordinates.",
      });
    }

    const post = await Post.create({
      user: req.user.userId,
      text: trimmedText,
      image,
      location,
      expiresAt: postExpiration.buildPostExpirationDate(),
    });

    await post.populate("user", "username");

    return res.status(201).json({
      message: "Post created successfully.",
      post,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Create post error:", error.message);
    return res.status(500).json({ message: "Server error during post creation." });
  }
};

const getFeed = async (req, res) => {
  try {
    const limit = parseFeedLimit(req.query.limit);
    const now = new Date();

    const feed = await Post.aggregate([
      {
        $match: {
          expiresAt: { $gt: now },
        },
      },
      {
        $sample: {
          size: limit,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          text: 1,
          image: 1,
          location: 1,
          echoCount: 1,
          expiresAt: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            id: "$user._id",
            username: "$user.username",
          },
        },
      },
    ]);

    return res.status(200).json({ feed });
  } catch (error) {
    console.error("Get feed error:", error.message);
    return res.status(500).json({ message: "Server error while fetching feed." });
  }
};

module.exports = {
  createPost,
  getFeed,
  parseFeedLimit,
  normalizeLocation,
};
