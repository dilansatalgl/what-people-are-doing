const mongoose = require("mongoose");

const dmThreadSchema = new mongoose.Schema(
  {
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientReplied: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

dmThreadSchema.index({ initiator: 1, recipient: 1 }, { unique: true });
dmThreadSchema.index({ recipient: 1, initiator: 1 });

module.exports = mongoose.model("DmThread", dmThreadSchema);
