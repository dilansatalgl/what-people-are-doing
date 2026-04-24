const mongoose = require("mongoose");
const Echo = require("../models/Echo");
const Post = require("../models/Post");
const Reaction = require("../models/Reaction");
const { REACTION_TYPES } = require("../models/Reaction");

const buildReactionCounts = (stored) => {
  const counts = {};
  for (const type of REACTION_TYPES) {
    counts[type] = Math.max(0, stored?.[type] ?? 0);
  }
  return counts;
};

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
        $lookup: {
          from: Echo.collection.name,
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$post", "$$postId"] },
                    { $eq: ["$user", new mongoose.Types.ObjectId(currentUserId)] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "userEcho",
        },
      },
      {
        $lookup: {
          from: Reaction.collection.name,
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$post", "$$postId"] },
                    { $eq: ["$user", new mongoose.Types.ObjectId(currentUserId)] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "userReactionDoc",
        },
      },
      {
        $project: {
          _id: 1,
          text: 1,
          image: 1,
          createdAt: 1,
          expiresAt: 1,
          echoCount: 1,
          reactionCounts: 1,
          "location.name": 1,
          "location.coordinates": 1,
          username: "$userInfo.username",
          hasEchoed: { $gt: [{ $size: "$userEcho" }, 0] },
          userReaction: {
            $ifNull: [{ $arrayElemAt: ["$userReactionDoc.type", 0] }, null],
          },
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
      echoCount: post.echoCount ?? 0,
      hasEchoed: post.hasEchoed ?? false,
      reactionCounts: buildReactionCounts(post.reactionCounts),
      userReaction: post.userReaction ?? null,
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