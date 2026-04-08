const mongoose = require("mongoose");
const { buildPostExpirationDate } = require("../config/postExpiration");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 280,
    },
    image: {
      type: String,
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      name: {
        type: String,
        default: null,
      },
    },
    echoCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => buildPostExpirationDate(),
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Post", postSchema);
