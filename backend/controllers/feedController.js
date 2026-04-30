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

const DEFAULT_NEARBY_RADIUS_METERS = 2000;
const MAX_NEARBY_RADIUS_METERS = 10000;
const FEED_LIMIT = 20;

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
        $sample: { size: FEED_LIMIT },
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

const getNearbyFeed = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const longitudeRaw = req.query.longitude;
    const latitudeRaw = req.query.latitude;
    const radiusRaw = req.query.radius;

    if (
      longitudeRaw === undefined ||
      latitudeRaw === undefined ||
      longitudeRaw === "" ||
      latitudeRaw === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Longitude and latitude are required.",
      });
    }

    const longitude = Number(longitudeRaw);
    const latitude = Number(latitudeRaw);

    const radius =
      radiusRaw !== undefined && radiusRaw !== ""
        ? Number(radiusRaw)
        : DEFAULT_NEARBY_RADIUS_METERS;

    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be a number between -180 and 180.",
      });
    }

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be a number between -90 and 90.",
      });
    }

    if (Number.isNaN(radius) || radius <= 0) {
      return res.status(400).json({
        success: false,
        message: "Radius must be a positive number.",
      });
    }

    if (radius > MAX_NEARBY_RADIUS_METERS) {
      return res.status(400).json({
        success: false,
        message: `Radius cannot exceed ${MAX_NEARBY_RADIUS_METERS} meters.`,
      });
    }

    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);

    const posts = await Post.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distanceMeters",
          maxDistance: radius,
          spherical: true,
          query: {
            expiresAt: { $gt: new Date() },
            user: { $ne: currentUserObjectId },
          },
        },
      },
      {
        $limit: FEED_LIMIT,
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
                    { $eq: ["$user", currentUserObjectId] },
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
        $project: {
          _id: 1,
          text: 1,
          image: 1,
          createdAt: 1,
          expiresAt: 1,
          distanceMeters: 1,
          echoCount: 1,
          "location.name": 1,
          "location.coordinates": 1,
          username: "$userInfo.username",
          hasEchoed: { $gt: [{ $size: "$userEcho" }, 0] },
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
      distanceMeters: Math.round(post.distanceMeters),
      createdAt: post.createdAt,
      expiresAt: post.expiresAt,
      username: post.username,
      echoCount: post.echoCount ?? 0,
      hasEchoed: post.hasEchoed ?? false,
    }));

    return res.status(200).json({
      success: true,
      count: formattedPosts.length,
      posts: formattedPosts,
    });
  } catch (error) {
    console.error("Get nearby feed error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load nearby feed.",
    });
  }
};

module.exports = {
  getRandomFeed,
  getNearbyFeed,
};