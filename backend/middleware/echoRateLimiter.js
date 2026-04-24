const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const echoRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.user?.userId ?? ipKeyGenerator(req, res),
  message: {
    success: false,
    message: "Too many echo actions. Please try again shortly.",
  },
});

module.exports = echoRateLimiter;
