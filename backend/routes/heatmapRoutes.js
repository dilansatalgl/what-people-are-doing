const express = require("express");
const router = express.Router();

const { getGlobalHeatmap } = require("../controllers/heatmapController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getGlobalHeatmap);

module.exports = router;