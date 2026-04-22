const rateLimit = require("express-rate-limit");

const feedRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many feed requests. Please try again shortly.",
  },
});

module.exports = feedRateLimiter;