const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const { startPostCleanupJob } = require("./services/postCleanupService");

const app = express();
const PORT = process.env.PORT || 3000;

// middleware to parse JSON
app.use(express.json());

// auth routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

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
