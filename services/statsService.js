// kinda confirm

const { DUST_SOL } = require("../config");
const { median, utcDay } = require("./analysisUtils");

function buildStats({ closedPositions, normalizedSwaps }) {
  const wins = closedPositions.filter((p) => p.pnlSol > DUST_SOL);
  const losses = closedPositions.filter((p) => p.pnlSol < -DUST_SOL);
  const breakeven = closedPositions.length - wins.length - losses.length;

  const closedPositionPnlSol = closedPositions.reduce(
    (sum, p) => sum + p.pnlSol,
    0,
  );

  let totalBuySol = 0;
  let totalSellSol = 0;
  const timestamps = [];
  const activeDays = new Set();

  for (const swap of normalizedSwaps) {
    if (swap.side === "BUY") totalBuySol += swap.sol;
    else if (swap.side === "SELL") totalSellSol += swap.sol;
    if (Number.isFinite(swap.ts)) {
      timestamps.push(swap.ts);
      activeDays.add(utcDay(swap.ts));
    }
  }

  const firstTs = timestamps.length ? Math.min(...timestamps) : null;
  const lastTs = timestamps.length ? Math.max(...timestamps) : null;
  const calendarSpanDays =
    firstTs != null && lastTs != null
      ? Math.floor((lastTs - firstTs) / 86400) + 1
      : null;

  return {
    closedCount: closedPositions.length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winRate: closedPositions.length
      ? wins.length / closedPositions.length
      : null,

    totalBuySol,
    totalSellSol,

    totalSolIn: totalBuySol,
    totalSolOut: totalSellSol,
    buySellRatio: totalSellSol > 0 ? totalBuySol / totalSellSol : null,

    closedPositionPnlSol,

    netPnlSol: closedPositionPnlSol,
    avgWinSol: wins.length
      ? wins.reduce((sum, p) => sum + p.pnlSol, 0) / wins.length
      : null,
    avgLossSol: losses.length
      ? losses.reduce((sum, p) => sum + p.pnlSol, 0) / losses.length
      : null,
    winHoldMedianSeconds: median(wins.map((p) => p.holdSeconds)),
    lossHoldMedianSeconds: median(losses.map((p) => p.holdSeconds)),

    activeDays: activeDays.size,
    calendarSpanDays,

    tradesPerDay: activeDays.size
      ? normalizedSwaps.length / activeDays.size
      : null,

    tradesPerCalendarSpanDay: calendarSpanDays
      ? normalizedSwaps.length / calendarSpanDays
      : null,
    firstTradeDate:
      firstTs != null ? new Date(firstTs * 1000).toISOString() : null,
    lastTradeDate:
      lastTs != null ? new Date(lastTs * 1000).toISOString() : null,
  };
}

module.exports = { buildStats };
