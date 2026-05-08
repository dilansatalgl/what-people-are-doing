const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Post = require("../models/Post");
const { getRandomFeed } = require("../controllers/feedController");

const originalAggregate = Post.aggregate;

const restoreModel = () => {
  Post.aggregate = originalAggregate;
};

test.afterEach(() => {
  restoreModel();
});

test("getRandomFeed returns formatted feed posts", async () => {
  const userId = new mongoose.Types.ObjectId().toString();

  const req = {
    user: {
      userId,
    },
  };

  let statusCode;
  let jsonBody;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonBody = body;
      return this;
    },
  };

  const mockPosts = [
    {
      _id: new mongoose.Types.ObjectId(),
      text: "Having coffee",
      image: "uploads/coffee.jpg",
      location: {
        name: "Kadıköy, Istanbul",
        coordinates: [29.032, 40.991],
      },
      createdAt: new Date("2026-04-22T10:00:00.000Z"),
      expiresAt: new Date("2026-04-22T12:00:00.000Z"),
      username: "beren",
    },
  ];

  let aggregatePipeline;
  Post.aggregate = async (pipeline) => {
    aggregatePipeline = pipeline;
    return mockPosts;
  };

  await getRandomFeed(req, res);

  assert.equal(statusCode, 200);
  assert.deepEqual(aggregatePipeline[1], {
    $addFields: {
      feedWeight: {
        $add: [{ $max: [{ $ifNull: ["$echoCount", 0] }, 0] }, 1],
      },
      feedRandom: {
        $max: [{ $rand: {} }, 1e-12],
      },
    },
  });
  assert.deepEqual(aggregatePipeline[2], {
    $addFields: {
      feedRank: {
        $divide: [
          { $multiply: [-1, { $ln: "$feedRandom" }] },
          "$feedWeight",
        ],
      },
    },
  });
  assert.deepEqual(aggregatePipeline[3], {
    $sort: {
      feedRank: 1,
      createdAt: -1,
    },
  });
  assert.deepEqual(aggregatePipeline[4], {
    $limit: 120,
  });
  assert.deepEqual(jsonBody, {
    success: true,
    count: 1,
    posts: [
      {
        postId: mockPosts[0]._id,
        text: "Having coffee",
        image: "uploads/coffee.jpg",
        locationName: "Kadıköy, Istanbul",
        coordinates: {
          longitude: 29.032,
          latitude: 40.991,
        },
        createdAt: mockPosts[0].createdAt,
        expiresAt: mockPosts[0].expiresAt,
        username: "beren",
        echoCount: 0,
        hasEchoed: false,
        reactionCounts: {
          cry: 0,
          laugh: 0,
          love: 0,
          sad: 0,
          wow: 0,
        },
        userReaction: null,
      },
    ],
  });
});

test("getRandomFeed returns empty feed successfully", async () => {
  const req = {
    user: {
      userId: new mongoose.Types.ObjectId().toString(),
    },
  };

  let statusCode;
  let jsonBody;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonBody = body;
      return this;
    },
  };

  Post.aggregate = async () => [];

  await getRandomFeed(req, res);

  assert.equal(statusCode, 200);
  assert.deepEqual(jsonBody, {
    success: true,
    count: 0,
    posts: [],
  });
});

test("getRandomFeed returns 500 when an error occurs", async () => {
  const req = {
    user: {
      userId: new mongoose.Types.ObjectId().toString(),
    },
  };

  let statusCode;
  let jsonBody;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonBody = body;
      return this;
    },
  };

  Post.aggregate = async () => {
    throw new Error("Database error");
  };

  await getRandomFeed(req, res);

  assert.equal(statusCode, 500);
  assert.deepEqual(jsonBody, {
    success: false,
    message: "Failed to load feed.",
  });
});
