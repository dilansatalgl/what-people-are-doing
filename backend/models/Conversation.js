const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorRevealed: {
      type: Boolean,
      default: false,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastMessagePreview: {
      type: String,
      default: "",
      maxlength: 200,
    },
    unreadByCreator: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadByInitiator: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ post: 1, initiator: 1 }, { unique: true });
conversationSchema.index({ creator: 1, lastMessageAt: -1 });
conversationSchema.index({ initiator: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
