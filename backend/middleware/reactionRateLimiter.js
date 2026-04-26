const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const reactionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.user?.userId ?? ipKeyGenerator(req, res),
  message: {
    success: false,
    message: "Too many reaction changes. Please try again shortly.",
  },
});

module.exports = reactionRateLimiter;
