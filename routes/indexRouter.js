const { Router } = require("express");
const indexRouter = Router();

indexRouter.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Wallet Forensics API",
    message: "Server is running. Point requests to /api/wallet-report",
    version: "1.0.0",
  });
});

module.exports = indexRouter;
