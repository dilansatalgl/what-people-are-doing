const Echo = require("../models/Echo");
const Post = require("../models/Post");
const postExpiration = require("../config/postExpiration");

const deleteExpiredPosts = async (now = new Date()) => {
  let deletedPosts = 0;
  let deletedEchoes = 0;

  const expiredPosts = await Post.find({
    expiresAt: { $lte: now },
  }).select("_id");

  if (expiredPosts.length > 0) {
    const expiredPostIds = expiredPosts.map(({ _id }) => _id);

    const echoDeletionResult = await Echo.deleteMany({
      post: { $in: expiredPostIds },
    });
    const postDeletionResult = await Post.deleteMany({
      _id: { $in: expiredPostIds },
    });

    deletedEchoes += echoDeletionResult.deletedCount || 0;
    deletedPosts += postDeletionResult.deletedCount || 0;
  }

  return {
    deletedPosts,
    deletedEchoes,
  };
};

const startPostCleanupJob = () => {
  let cleanupInProgress = false;

  const runCleanup = async () => {
    if (cleanupInProgress) {
      return null;
    }

    cleanupInProgress = true;

    try {
      const cleanupSummary = await deleteExpiredPosts();

      if (cleanupSummary.deletedPosts > 0 || cleanupSummary.deletedEchoes > 0) {
        console.log(
          `Removed ${cleanupSummary.deletedPosts} expired posts and ${cleanupSummary.deletedEchoes} related echoes.`
        );
      }

      return cleanupSummary;
    } catch (error) {
      console.error("Post cleanup job failed:", error.message);
      return null;
    } finally {
      cleanupInProgress = false;
    }
  };

  void runCleanup();

  const intervalHandle = setInterval(() => {
    void runCleanup();
  }, postExpiration.POST_CLEANUP_INTERVAL_MS);

  if (typeof intervalHandle.unref === "function") {
    intervalHandle.unref();
  }

  return intervalHandle;
};

module.exports = {
  deleteExpiredPosts,
  startPostCleanupJob,
};
