const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const {
  usersSolanaInput,
  getWalletSwaps,
  getWalletReport,
} = require("../controllers/userController");
const { requireValidAddress } = require("../middlewares/addressMiddleware");

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

usersRouter.post(
  "/validate-solana",
  rpcShieldLimiter,
  requireValidAddress,
  usersSolanaInput,
);
usersRouter.post(
  "/wallet-swaps",
  rpcShieldLimiter,
  requireValidAddress,
  getWalletSwaps,
);
usersRouter.post(
  "/wallet-report",
  rpcShieldLimiter,
  requireValidAddress,
  getWalletReport,
);

module.exports = usersRouter;
