const rateLimit = require("express-rate-limit");

const echoRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip,
  message: {
    success: false,
    message: "Too many echo actions. Please try again shortly.",
  },
});

module.exports = echoRateLimiter;
