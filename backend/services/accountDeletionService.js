const Echo = require("../models/Echo");
const Post = require("../models/Post");
const User = require("../models/User");

const deleteAccountData = async (userId) => {
  const user = await User.findById(userId).select("_id");

  if (!user) {
    return {
      deleted: false,
      deletedPostCount: 0,
      deletedEchoCount: 0,
    };
  }

  const ownedPosts = await Post.find({ user: userId }).select("_id");
  const ownedPostIds = ownedPosts.map(({ _id }) => _id);

  const echoDeletionFilters = [{ user: userId }];

  if (ownedPostIds.length > 0) {
    echoDeletionFilters.push({ post: { $in: ownedPostIds } });
  }

  const echoDeletionResult = await Echo.deleteMany({
    $or: echoDeletionFilters,
  });
  const postDeletionResult = await Post.deleteMany({ user: userId });
  await User.deleteOne({ _id: userId });

  return {
    deleted: true,
    deletedPostCount: postDeletionResult.deletedCount || 0,
    deletedEchoCount: echoDeletionResult.deletedCount || 0,
  };
};

module.exports = {
  deleteAccountData,
};
