const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const {
  usersSolanaInput,
  getWalletSwaps,
} = require("../controllers/userController");

const usersRouter = Router();

const rpcShieldLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,

  handler: (req, res, next, options) => {
    return res.status(429).json({
      status: "REJECTED",
      error: "RATE_LIMIT_EXCEEDED",
      details:
        "Too many wallet lookups initiated from this IP address. Please slow down to preserve RPC infrastructure resources.",
    });
  },

  skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1",
});

usersRouter.post("/validate-solana", rpcShieldLimiter, usersSolanaInput);
usersRouter.post("/wallet-swaps", getWalletSwaps);

module.exports = usersRouter;
