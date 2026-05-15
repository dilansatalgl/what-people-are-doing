const postExpiration = require("../config/postExpiration");

const deleteExpiredPosts = async () => {
  return {
    deletedPosts: 0,
    deletedEchoes: 0,
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
