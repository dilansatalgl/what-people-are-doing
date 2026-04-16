const test = require("node:test");
const assert = require("node:assert/strict");

const Echo = require("../models/Echo");
const Post = require("../models/Post");
const User = require("../models/User");
const { deleteAccountData } = require("../services/accountDeletionService");

const originalFindById = User.findById;
const originalFindPosts = Post.find;
const originalDeleteEchoes = Echo.deleteMany;
const originalDeletePosts = Post.deleteMany;
const originalDeleteUser = User.deleteOne;

const restoreModels = () => {
  User.findById = originalFindById;
  Post.find = originalFindPosts;
  Echo.deleteMany = originalDeleteEchoes;
  Post.deleteMany = originalDeletePosts;
  User.deleteOne = originalDeleteUser;
};

test.afterEach(() => {
  restoreModels();
});

test("deleteAccountData returns deleted false when the user does not exist", async () => {
  let echoDeleteCalls = 0;
  let postDeleteCalls = 0;
  let userDeleteCalls = 0;

  User.findById = () => ({
    select: async () => null,
  });
  Echo.deleteMany = async () => {
    echoDeleteCalls += 1;
    return { deletedCount: 0 };
  };
  Post.deleteMany = async () => {
    postDeleteCalls += 1;
    return { deletedCount: 0 };
  };
  User.deleteOne = async () => {
    userDeleteCalls += 1;
    return { deletedCount: 0 };
  };

  const result = await deleteAccountData("missing-user");

  assert.deepEqual(result, {
    deleted: false,
    deletedPostCount: 0,
    deletedEchoCount: 0,
  });
  assert.equal(echoDeleteCalls, 0);
  assert.equal(postDeleteCalls, 0);
  assert.equal(userDeleteCalls, 0);
});

test("deleteAccountData removes the user, owned posts, and related echoes", async () => {
  let echoDeletionFilter;
  let postDeletionFilter;
  let userDeletionFilter;

  User.findById = () => ({
    select: async () => ({ _id: "user-1" }),
  });
  Post.find = () => ({
    select: async () => [{ _id: "post-1" }, { _id: "post-2" }],
  });
  Echo.deleteMany = async (filter) => {
    echoDeletionFilter = filter;
    return { deletedCount: 5 };
  };
  Post.deleteMany = async (filter) => {
    postDeletionFilter = filter;
    return { deletedCount: 2 };
  };
  User.deleteOne = async (filter) => {
    userDeletionFilter = filter;
    return { deletedCount: 1 };
  };

  const result = await deleteAccountData("user-1");

  assert.deepEqual(result, {
    deleted: true,
    deletedPostCount: 2,
    deletedEchoCount: 5,
  });
  assert.deepEqual(echoDeletionFilter, {
    $or: [
      { user: "user-1" },
      { post: { $in: ["post-1", "post-2"] } },
    ],
  });
  assert.deepEqual(postDeletionFilter, { user: "user-1" });
  assert.deepEqual(userDeletionFilter, { _id: "user-1" });
});

test("deleteAccountData removes user echoes even when the user owns no posts", async () => {
  let echoDeletionFilter;

  User.findById = () => ({
    select: async () => ({ _id: "user-2" }),
  });
  Post.find = () => ({
    select: async () => [],
  });
  Echo.deleteMany = async (filter) => {
    echoDeletionFilter = filter;
    return { deletedCount: 1 };
  };
  Post.deleteMany = async () => ({ deletedCount: 0 });
  User.deleteOne = async () => ({ deletedCount: 1 });

  const result = await deleteAccountData("user-2");

  assert.deepEqual(result, {
    deleted: true,
    deletedPostCount: 0,
    deletedEchoCount: 1,
  });
  assert.deepEqual(echoDeletionFilter, {
    $or: [{ user: "user-2" }],
  });
});
