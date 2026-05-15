const test = require("node:test");
const assert = require("node:assert/strict");

const Echo = require("../models/Echo");
const Post = require("../models/Post");
const { deleteExpiredPosts } = require("../services/postCleanupService");

test("deleteExpiredPosts preserves expired posts and their echoes", async () => {
  const originalFind = Post.find;
  const originalDeleteManyPosts = Post.deleteMany;
  const originalDeleteManyEchoes = Echo.deleteMany;
  let postFindWasCalled = false;
  let postDeletionWasCalled = false;
  let echoDeletionWasCalled = false;

  Post.find = () => {
    postFindWasCalled = true;
    return [];
  };

  Post.deleteMany = async () => {
    postDeletionWasCalled = true;
    return { deletedCount: 0 };
  };

  Echo.deleteMany = async () => {
    echoDeletionWasCalled = true;
    return { deletedCount: 0 };
  };

  try {
    const cleanupSummary = await deleteExpiredPosts(
      new Date("2026-04-07T10:00:00.000Z")
    );

    assert.deepEqual(cleanupSummary, {
      deletedPosts: 0,
      deletedEchoes: 0,
    });
    assert.equal(postFindWasCalled, false);
    assert.equal(postDeletionWasCalled, false);
    assert.equal(echoDeletionWasCalled, false);
  } finally {
    Post.find = originalFind;
    Post.deleteMany = originalDeleteManyPosts;
    Echo.deleteMany = originalDeleteManyEchoes;
  }
});
