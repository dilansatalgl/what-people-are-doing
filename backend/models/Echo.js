const mongoose = require("mongoose");

const echoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// prevent duplicate echoes: one echo per user per post
echoSchema.index({ user: 1, post: 1 }, { unique: true });

// index for rate limiting queries: find recent echoes by a user
echoSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Echo", echoSchema);
