const {
  DUST_SOL,
  OVERTRADE_FACTOR,
  OVERTRADE_FLOOR,
  MIN_ACTIVE_DAYS,
} = require("../config");

function median(nums) {
  const s = nums
    .filter((n) => n != null && Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function dayKey(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function buildOvertradingAnalysis(normalizedSwaps) {
  const days = new Map();
  for (const s of normalizedSwaps) {
    if (s.ts == null) continue;
    const key = dayKey(s.ts);
    if (!days.has(key)) days.set(key, { date: key, trades: 0, netSol: 0 });
    const d = days.get(key);
    d.trades += 1;
    d.netSol += s.side === "BUY" ? -s.sol : s.sol;
  }

  const dayList = [...days.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const activeDays = dayList.length;

  if (activeDays < MIN_ACTIVE_DAYS) {
    return {
      activeDays,
      medianTradesPerDay: median(dayList.map((d) => d.trades)),
      threshold: null,
      losingDays: null,
      flaggedDays: [],
      overtradingPct: null,
    };
  }

  const med = median(dayList.map((d) => d.trades));
  const threshold = Math.max(med * OVERTRADE_FACTOR, med + OVERTRADE_FLOOR);

  const losingDays = dayList.filter((d) => d.netSol < -DUST_SOL);
  const flaggedDays = losingDays.filter((d) => d.trades > threshold);

  return {
    activeDays,
    medianTradesPerDay: med,
    threshold,
    losingDays: losingDays.length,
    flaggedDays: flaggedDays.map((d) => ({
      date: d.date,
      trades: d.trades,
      netSol: d.netSol,
    })),
    overtradingPct: losingDays.length
      ? flaggedDays.length / losingDays.length
      : null,
  };
}

module.exports = { buildOvertradingAnalysis };
