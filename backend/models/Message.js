const mongoose = require("mongoose");

const MAX_MESSAGE_LENGTH = 1000;

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: MAX_MESSAGE_LENGTH,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
module.exports.MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH;
