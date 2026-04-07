const test = require("node:test");
const assert = require("node:assert/strict");

const Echo = require("../models/Echo");
const Post = require("../models/Post");
const {
  deleteExpiredPosts,
  deleteOrphanedEchoes,
} = require("../services/postCleanupService");

test("deleteOrphanedEchoes removes echoes whose posts no longer exist", async () => {
  const originalAggregate = Echo.aggregate;
  const originalDeleteMany = Echo.deleteMany;
  let aggregatePipeline;
  let deleteQuery;

  Echo.aggregate = async (pipeline) => {
    aggregatePipeline = pipeline;
    return [{ _id: "echo-1" }, { _id: "echo-2" }];
  };

  Echo.deleteMany = async (query) => {
    deleteQuery = query;
    return { deletedCount: 2 };
  };

  try {
    const deletedEchoCount = await deleteOrphanedEchoes();

    assert.equal(Array.isArray(aggregatePipeline), true);
    assert.deepEqual(deleteQuery, {
      _id: { $in: ["echo-1", "echo-2"] },
    });
    assert.equal(deletedEchoCount, 2);
  } finally {
    Echo.aggregate = originalAggregate;
    Echo.deleteMany = originalDeleteMany;
  }
});

test("deleteExpiredPosts removes expired posts and their echoes", async () => {
  const originalFind = Post.find;
  const originalDeleteManyPosts = Post.deleteMany;
  const originalDeleteManyEchoes = Echo.deleteMany;
  const originalAggregate = Echo.aggregate;
  const now = new Date("2026-04-07T10:00:00.000Z");

  let findQuery;
  let postDeleteQuery;
  const echoDeleteQueries = [];

  Post.find = (query) => {
    findQuery = query;

    return {
      async select(selection) {
        assert.equal(selection, "_id");
        return [{ _id: "post-1" }, { _id: "post-2" }];
      },
    };
  };

  Post.deleteMany = async (query) => {
    postDeleteQuery = query;
    return { deletedCount: 2 };
  };

  Echo.deleteMany = async (query) => {
    echoDeleteQueries.push(query);

    if (query.post) {
      return { deletedCount: 3 };
    }

    return { deletedCount: 0 };
  };

  Echo.aggregate = async () => [];

  try {
    const cleanupSummary = await deleteExpiredPosts(now);

    assert.deepEqual(findQuery, {
      expiresAt: { $lte: now },
    });
    assert.deepEqual(echoDeleteQueries[0], {
      post: { $in: ["post-1", "post-2"] },
    });
    assert.deepEqual(postDeleteQuery, {
      _id: { $in: ["post-1", "post-2"] },
    });
    assert.deepEqual(cleanupSummary, {
      deletedPosts: 2,
      deletedEchoes: 3,
    });
  } finally {
    Post.find = originalFind;
    Post.deleteMany = originalDeleteManyPosts;
    Echo.deleteMany = originalDeleteManyEchoes;
    Echo.aggregate = originalAggregate;
  }
});

test("deleteExpiredPosts returns zeros when nothing has expired", async () => {
  const originalFind = Post.find;
  const originalAggregate = Echo.aggregate;
  const originalDeleteManyEchoes = Echo.deleteMany;
  let echoDeletionWasCalled = false;

  Post.find = () => ({
    async select() {
      return [];
    },
  });

  Echo.aggregate = async () => [];
  Echo.deleteMany = async () => {
    echoDeletionWasCalled = true;
    return { deletedCount: 0 };
  };

  try {
    const cleanupSummary = await deleteExpiredPosts();

    assert.deepEqual(cleanupSummary, {
      deletedPosts: 0,
      deletedEchoes: 0,
    });
    assert.equal(echoDeletionWasCalled, false);
  } finally {
    Post.find = originalFind;
    Echo.aggregate = originalAggregate;
    Echo.deleteMany = originalDeleteManyEchoes;
  }
});
