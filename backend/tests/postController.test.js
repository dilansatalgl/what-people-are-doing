const test = require("node:test");
const assert = require("node:assert/strict");

const Post = require("../models/Post");
const postExpiration = require("../config/postExpiration");
const {
  createPost,
  getFeed,
  parseFeedLimit,
  normalizeLocation,
} = require("../controllers/postController");

const createResponse = () => ({
  statusCode: 200,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

test("normalizeLocation returns sanitized coordinates and trimmed name", () => {
  assert.deepEqual(
    normalizeLocation({
      coordinates: ["139.6917", "35.6895"],
      name: " Tokyo ",
    }),
    {
      coordinates: [139.6917, 35.6895],
      name: "Tokyo",
    }
  );
});

test("parseFeedLimit falls back safely and caps oversized requests", () => {
  assert.equal(parseFeedLimit(undefined), 20);
  assert.equal(parseFeedLimit("-5"), 20);
  assert.equal(parseFeedLimit("12"), 12);
  assert.equal(parseFeedLimit("999"), 100);
});

test("createPost stamps an expiration time and returns the created post", async () => {
  const originalCreate = Post.create;
  const originalBuildPostExpirationDate = postExpiration.buildPostExpirationDate;
  const fixedExpiry = new Date("2026-04-08T12:00:00.000Z");

  let createPayload;

  Post.create = async (payload) => {
    createPayload = payload;

    return {
      _id: "post-1",
      ...payload,
      async populate() {
        this.user = {
          _id: payload.user,
          username: "beren",
        };

        return this;
      },
    };
  };

  postExpiration.buildPostExpirationDate = () => fixedExpiry;

  try {
    const req = {
      body: {
        text: "  Eating ramen in Tokyo  ",
        image: "  https://example.com/ramen.jpg  ",
        location: {
          coordinates: ["139.6917", "35.6895"],
          name: " Tokyo ",
        },
      },
      user: {
        userId: "user-1",
      },
    };
    const res = createResponse();

    await createPost(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createPayload.text, "Eating ramen in Tokyo");
    assert.equal(createPayload.image, "https://example.com/ramen.jpg");
    assert.equal(createPayload.expiresAt, fixedExpiry);
    assert.deepEqual(createPayload.location, {
      coordinates: [139.6917, 35.6895],
      name: "Tokyo",
    });
    assert.equal(res.payload.post.user.username, "beren");
  } finally {
    Post.create = originalCreate;
    postExpiration.buildPostExpirationDate = originalBuildPostExpirationDate;
  }
});

test("createPost rejects requests with invalid coordinates", async () => {
  const originalCreate = Post.create;
  let createWasCalled = false;

  Post.create = async () => {
    createWasCalled = true;
  };

  try {
    const req = {
      body: {
        text: "Walking downtown",
        location: {
          coordinates: ["invalid", 35.0],
        },
      },
      user: {
        userId: "user-1",
      },
    };
    const res = createResponse();

    await createPost(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(createWasCalled, false);
    assert.equal(
      res.payload.message,
      "Location must include valid [longitude, latitude] coordinates."
    );
  } finally {
    Post.create = originalCreate;
  }
});

test("getFeed only requests non-expired posts and respects the feed limit", async () => {
  const originalAggregate = Post.aggregate;
  let aggregatePipeline;

  Post.aggregate = async (pipeline) => {
    aggregatePipeline = pipeline;
    return [{ _id: "post-1", text: "Active post" }];
  };

  try {
    const req = {
      query: {
        limit: "150",
      },
    };
    const res = createResponse();

    await getFeed(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(aggregatePipeline[0].$match.expiresAt.$gt instanceof Date, true);
    assert.equal(aggregatePipeline[1].$sample.size, 100);
    assert.deepEqual(res.payload.feed, [{ _id: "post-1", text: "Active post" }]);
  } finally {
    Post.aggregate = originalAggregate;
  }
});
