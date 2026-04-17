const test = require("node:test");
const assert = require("node:assert/strict");

const Echo = require("../models/Echo");
const Post = require("../models/Post");
const { deleteExpiredPosts } = require("../services/postCleanupService");

test("deleteExpiredPosts removes expired posts and their echoes", async () => {
  const originalFind = Post.find;
  const originalDeleteManyPosts = Post.deleteMany;
  const originalDeleteManyEchoes = Echo.deleteMany;
  const now = new Date("2026-04-07T10:00:00.000Z");

  let findQuery;
  let postDeleteQuery;
  let echoDeleteQuery;

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
    echoDeleteQuery = query;
    return { deletedCount: 3 };
  };

  try {
    const cleanupSummary = await deleteExpiredPosts(now);

    assert.deepEqual(findQuery, {
      expiresAt: { $lte: now },
    });
    assert.deepEqual(echoDeleteQuery, {
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
  }
});

test("deleteExpiredPosts returns zeros when nothing has expired", async () => {
  const originalFind = Post.find;
  const originalDeleteManyEchoes = Echo.deleteMany;
  let echoDeletionWasCalled = false;

  Post.find = () => ({
    async select() {
      return [];
    },
  });
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
    Echo.deleteMany = originalDeleteManyEchoes;
  }
});
