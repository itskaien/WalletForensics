// test in terminal

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildStats } = require("../services/statsService");
const { buildRevengeAnalysis } = require("../services/revenge");
const { buildOvertradingAnalysis } = require("../services/overtrade");
const { buildBigLossAnalysis } = require("../services/bigLoss");
const { buildFomoAnalysis } = require("../services/fomo");
const { buildGrades, band } = require("../services/grades");

const iso = (ts) => new Date(ts * 1000).toISOString();
const loss = (closeTs, pnlSol = -1, mint = "A") => ({
  mint,
  closeTs,
  closeDate: iso(closeTs),
  pnlSol,
});
const buy = (ts, sol, tokenQty, mint = "A") => ({
  sig: `${mint}-${ts}`,
  ts,
  date: iso(ts),
  side: "BUY",
  sol,
  tokenQty,
  mint,
});
const sell = (ts, sol, tokenQty, mint = "A") => ({
  ...buy(ts, sol, tokenQty, mint),
  side: "SELL",
});

test("step 9 separates buy/sell totals and active-day from span-day activity", () => {
  const stats = buildStats({
    normalizedSwaps: [buy(0, 2, 10), sell(3600, 1, 5), buy(86400, 3, 10)],
    closedPositions: [
      { pnlSol: 1, holdSeconds: 10 },
      { pnlSol: -2, holdSeconds: 30 },
    ],
  });
  assert.equal(stats.totalBuySol, 5);
  assert.equal(stats.totalSellSol, 1);
  assert.equal(stats.closedPositionPnlSol, -1);
  assert.equal(stats.tradesPerDay, 1.5);
  assert.equal(stats.tradesPerCalendarSpanDay, 1.5);
  assert.equal(stats.winRate, 0.5);
});

test("step 11 finds qualifying loss clusters and a restrategizing gap", () => {
  const positions = [
    loss(0),
    loss(3600),
    loss(7200),
    { ...loss(7300, 1), pnlSol: 1 },
    loss(7200 + 5 * 3600),
    loss(7200 + 6 * 3600),
    loss(7200 + 7 * 3600),
  ];
  const result = buildRevengeAnalysis(positions);
  assert.equal(result.totalLosses, 6);
  assert.equal(result.lossesInFlaggedStreaks, 6);
  assert.equal(result.revengePct, 1);
  assert.equal(result.restrategizeFlags.length, 1);
});

test("step 12 implements high volume + final two closed losses and exact denominator", () => {
  const counts = [1, 2, 3, 6, 10];
  const normalizedSwaps = [];
  counts.forEach((count, day) => {
    for (let i = 0; i < count; i += 1) {
      normalizedSwaps.push(buy(day * 86400 + i * 60, 1, 1));
    }
  });
  const closedPositions = [
    loss(3 * 86400 + 100, -1),
    { ...loss(3 * 86400 + 200, 1), pnlSol: 1 }, // final win: soft note only
    loss(4 * 86400 + 100, -1),
    loss(4 * 86400 + 200, -1),
  ];
  const result = buildOvertradingAnalysis({ normalizedSwaps, closedPositions });
  assert.equal(result.medianTradesPerDay, 3);
  assert.equal(result.highVolumeDays.length, 2);
  assert.equal(result.softNoteDays.length, 1);
  assert.equal(result.flaggedDays.length, 1);
  assert.equal(result.losingDays, 1);
  assert.equal(result.overtradingPct, 1);
});

test("step 13 accumulates a cross-token drawdown and starts one 24h lockout", async () => {
  const normalizedSwaps = [
    buy(0, 1, 100, "A"),
    buy(1, 1, 100, "B"),
    sell(10, 0.4, 100, "A"),
    sell(20, 0.4, 100, "B"),
    buy(30, 0.2, 10, "C"),
  ];
  const result = await buildBigLossAnalysis({
    walletAddress: "wallet",
    normalizedSwaps,
    closedPositions: [loss(10, -0.6, "A"), loss(20, -0.6, "B")],
    balanceProvider: async (_wallet, time) => (time < 10 ? 8 : 9),
  });
  assert.equal(result.maxDrawdown.tokensInvolved, 2);
  assert.equal(result.maxDrawdown.peakIsInitialBaseline, true);
  assert.equal(result.lossEvents[0].lossPctOfCapitalBefore, 0.06);
  assert.ok(
    Math.abs(result.lossEvents[1].lossPctOfCapitalBefore - 0.12) < 1e-12,
  );
  assert.equal(result.lockouts.length, 1);
  assert.equal(result.lockouts[0].tradesDuringLockout, 1);
});

test("step 13 never converts a failed balance lookup into zero", async () => {
  const result = await buildBigLossAnalysis({
    walletAddress: "wallet",
    normalizedSwaps: [buy(0, 1, 100), sell(10, 0.4, 100)],
    closedPositions: [loss(10, -0.6)],
    balanceProvider: async () => {
      throw new Error("API unavailable");
    },
  });
  assert.equal(result.balanceLookupFailures, 1);
  assert.equal(result.lossEvents[0].capitalBeforeSol, null);
  assert.equal(result.lockouts.length, 0);
});

test("FOMO module detects only repeat-buy chasing and remains a separate metric", () => {
  const result = buildFomoAnalysis([
    buy(0, 1, 100),
    buy(3600, 2, 100),
    buy(100000, 1, 100),
  ]);
  assert.equal(result.chaseEvents, 1);
  assert.equal(result.solSpentChasing, 2);
  assert.equal(result.pctOfBuyVolumeChased, 0.5);
});

test("step 14 uses exact bands and MIN_LOSSES guard", () => {
  assert.equal(band(0).grade, "Clean");
  assert.equal(band(0.09999).grade, "Clean");
  assert.equal(band(0.1).grade, "Watch it");
  assert.equal(band(0.3).grade, "Bad");
  assert.equal(band(0.6).grade, "High Risk / Gambling");
  assert.equal(band(1.2).grade, "High Risk / Gambling");
  assert.equal(
    buildGrades({ revenge: { totalLosses: 4 } }).status,
    "NOT_ENOUGH_DATA",
  );
  const result = buildGrades({
    revenge: { totalLosses: 5, revengePct: 0.1, lossesInFlaggedStreaks: 1 },
    overtrade: { overtradingPct: 0.3, flaggedDays: [1], losingDays: 3 },
  });
  assert.equal(result.revengeTrading.grade, "Watch it");
  assert.equal(result.overtrading.grade, "Bad");
});
