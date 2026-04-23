const mongoose = require("mongoose");
const Post = require("../models/Post");

const getRandomFeed = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const posts = await Post.aggregate([
      {
        $match: {
          expiresAt: { $gt: new Date() },
          user: { $ne: new mongoose.Types.ObjectId(currentUserId) },
        },
      },
      {
        $sample: { size: 20 },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          _id: 1,
          text: 1,
          image: 1,
          createdAt: 1,
          expiresAt: 1,
          "location.name": 1,
          "location.coordinates": 1,
          username: "$userInfo.username",
        },
      },
    ]);

    const formattedPosts = posts.map((post) => ({
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
      username: post.username,
    }));

    return res.status(200).json({
      success: true,
      count: formattedPosts.length,
      posts: formattedPosts,
    });
  } catch (error) {
    console.error("Get random feed error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load feed.",
    });
  }
};

module.exports = {
  getRandomFeed,
};