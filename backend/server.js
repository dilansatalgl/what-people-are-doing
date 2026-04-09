const express = require("express");
require("dotenv").config();
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// connect to MongoDB
connectDB();

// middleware to parse JSON
app.use(express.json());

// auth routes
app.use("/api/auth", authRoutes);

// posting routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/posts", postRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});