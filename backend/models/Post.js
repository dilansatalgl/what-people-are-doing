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
      default: "",
      trim: true,
      maxlength: 280,
    },
    image: {
      type: String,
      required: true,
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
        validate: {
          validator: function (value) {
            return Array.isArray(value) && value.length === 2;
          },
          message: "Location must contain longitude and latitude",
        },
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
    reactionCounts: {
      love: { type: Number, default: 0 },
      laugh: { type: Number, default: 0 },
      wow: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      cry: { type: Number, default: 0 },
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
