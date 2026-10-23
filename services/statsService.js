const { DUST_SOL } = require("../config");

function median(nums) {
  const s = nums
    .filter((n) => n != null && Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function buildStats({ closedPositions, normalizedSwaps }) {
  const wins = closedPositions.filter((p) => p.pnlSol > DUST_SOL);
  const losses = closedPositions.filter((p) => p.pnlSol < -DUST_SOL);
  const breakeven = closedPositions.length - wins.length - losses.length;

  const netPnlSol = closedPositions.reduce((s, p) => s + p.pnlSol, 0);
  const avgWinSol = wins.length
    ? wins.reduce((s, p) => s + p.pnlSol, 0) / wins.length
    : null;
  const avgLossSol = losses.length
    ? losses.reduce((s, p) => s + p.pnlSol, 0) / losses.length
    : null;

  const winHoldMedian = median(wins.map((p) => p.holdSeconds));
  const lossHoldMedian = median(losses.map((p) => p.holdSeconds));

  const ts = normalizedSwaps.map((s) => s.ts).filter((t) => t != null);
  let spanDays = null;
  let tradesPerDay = null;
  if (ts.length >= 2) {
    spanDays = (Math.max(...ts) - Math.min(...ts)) / 86400;
    tradesPerDay = spanDays > 0 ? normalizedSwaps.length / spanDays : null;
  }

  let totalSolIn = 0;
  let totalSolOut = 0;
  for (const s of normalizedSwaps) {
    if (s.side === "BUY") totalSolIn += s.sol;
    else totalSolOut += s.sol;
  }

  const aggregateSol = totalSolIn / totalSolOut;

  return {
    closedCount: closedPositions.length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winRate: closedPositions.length
      ? wins.length / closedPositions.length
      : null,
    netPnlSol,
    aggregateSol,
    avgWinSol,
    avgLossSol,
    winHoldMedianSeconds: winHoldMedian,
    lossHoldMedianSeconds: lossHoldMedian,
    tradingSpanDays: spanDays,
    tradesPerDay,
    firstTradeDate: ts.length
      ? new Date(Math.min(...ts) * 1000).toISOString()
      : null,
    lastTradeDate: ts.length
      ? new Date(Math.max(...ts) * 1000).toISOString()
      : null,
  };
}

module.exports = { buildStats };
