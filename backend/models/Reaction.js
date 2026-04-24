const mongoose = require("mongoose");

const REACTION_TYPES = ["love", "laugh", "wow", "sad", "cry", "like"];

const reactionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: REACTION_TYPES,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reactionSchema.index({ post: 1 });
reactionSchema.index({ user: 1, post: 1 }, { unique: true });
reactionSchema.index({ user: 1, createdAt: -1 });

const Reaction = mongoose.model("Reaction", reactionSchema);

module.exports = Reaction;
module.exports.REACTION_TYPES = REACTION_TYPES;
