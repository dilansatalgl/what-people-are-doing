const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// connect to MongoDB
connectDB();

// middleware to parse JSON
app.use(express.json());

// auth routes
app.use("/api/auth", authRoutes);

// user routes
app.use("/api/users", userRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});