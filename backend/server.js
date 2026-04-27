const express = require("express");
require("dotenv").config();
const path = require("path");
const connectDB = require("./config/db");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const { startPostCleanupJob } = require("./services/postCleanupService");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const heatmapRoutes = require("./routes/heatmapRoutes");

const app = express();

app.use(cors({
  origin: "http://localhost:8081",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const PORT = process.env.PORT || 3000;

// middleware to parse JSON
app.use(express.json());

// auth routes
app.use("/api/auth", authRoutes);

// user routes
app.use("/api/users", userRoutes);

// posting routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/posts", postRoutes);

// heatmap route
app.use("/api/heatmap", heatmapRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

const startServer = async () => {
  await connectDB();
  startPostCleanupJob();

  return app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
