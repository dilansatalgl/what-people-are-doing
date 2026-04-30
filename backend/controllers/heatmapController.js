const Post = require("../models/Post");

const getGlobalHeatmap = async (req, res) => {
  try {
    const GRID_SIZE = 0.05; // roughly 5 km grid

    const heatmapData = await Post.aggregate([
      {
        $match: {
          expiresAt: { $gt: new Date() },
          "location.coordinates": { $exists: true },
        },
      },
      {
        $project: {
          longitude: { $arrayElemAt: ["$location.coordinates", 0] },
          latitude: { $arrayElemAt: ["$location.coordinates", 1] },
        },
      },
      {
        $group: {
          _id: {
            lat: {
              $multiply: [
                { $round: [{ $divide: ["$latitude", GRID_SIZE] }, 0] },
                GRID_SIZE,
              ],
            },
            lng: {
              $multiply: [
                { $round: [{ $divide: ["$longitude", GRID_SIZE] }, 0] },
                GRID_SIZE,
              ],
            },
          },
          weight: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          latitude: { $round: ["$_id.lat", 4] },
          longitude: { $round: ["$_id.lng", 4] },
          weight: 1,
        },
      },
      {
        $sort: { weight: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: heatmapData,
    });
  } catch (error) {
    console.error("Heatmap error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch heatmap data.",
    });
  }
};

module.exports = {
  getGlobalHeatmap,
};