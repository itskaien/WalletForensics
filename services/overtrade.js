const {
  DUST_SOL,
  OVERTRADE_LOSS_STREAK,
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

function perSellPnl(swaps) {
  const state = new Map();
  const outcomes = new Map();
  for (const s of swaps) {
    if (s.side === "BUY") {
      const st = state.get(s.mint) || { qty: 0, cost: 0 };
      st.qty += s.tokenQty;
      st.cost += s.sol;
      state.set(s.mint, st);
      continue;
    }
    const st = state.get(s.mint);
    if (!st || st.qty <= 0) continue;
    const matched = Math.min(s.tokenQty, st.qty);
    const ratio = matched / s.tokenQty;
    const proceeds = s.sol * ratio;
    const cost = (st.cost / st.qty) * matched;
    outcomes.set(s.sig, proceeds - cost);
    st.qty -= matched;
    st.cost -= cost;
  }
  return outcomes;
}

function buildOvertradingAnalysis(normalizedSwaps) {
  const outcomes = perSellPnl(normalizedSwaps);

  const dayMap = new Map();
  for (const s of normalizedSwaps) {
    if (s.ts == null) continue;
    const key = dayKey(s.ts);
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key).push(s);
  }
  const dayList = [...dayMap.entries()]
    .map(([date, swaps]) => ({ date, swaps }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const activeDays = dayList.length;
  const med = median(dayList.map((d) => d.swaps.length));
  if (activeDays < MIN_ACTIVE_DAYS) {
    return {
      activeDays,
      medianTradesPerDay: med,
      elevatedDays: null,
      flaggedDays: [],
      overtradingPct: null,
    };
  }

  let elevatedDays = 0;
  const flaggedDays = [];

  let withinWins = 0,
    withinSells = 0,
    beyondWins = 0,
    beyondSells = 0;

  for (const day of dayList) {
    const elevated = day.swaps.length > med;
    if (elevated) elevatedDays++;

    let run = 0;
    let maxRun = 0;
    let runSol = 0;
    let maxRunSol = 0;
    for (const s of day.swaps) {
      if (s.side !== "BUY" && outcomes.has(s.sig)) {
        const idx = day.swaps.indexOf(s);
        const pnl = outcomes.get(s.sig);
        const isLoss = pnl < -DUST_SOL;
        const isWin = pnl > DUST_SOL;

        // quality decay buckets
        if (idx < med) {
          withinSells++;
          if (isWin) withinWins++;
        } else {
          beyondSells++;
          if (isWin) beyondWins++;
        }

        if (isLoss) {
          run++;
          runSol += pnl;
        } else {
          run = 0;
          runSol = 0;
        }
        if (run > maxRun) {
          maxRun = run;
          maxRunSol = runSol;
        }
      }
    }

    if (elevated && maxRun >= OVERTRADE_LOSS_STREAK) {
      flaggedDays.push({
        date: day.date,
        trades: day.swaps.length,
        yourNorm: med,
        consecutiveLosses: maxRun,
        lossRunSol: maxRunSol,
        dayNetSol: day.swaps.reduce(
          (n, s) => n + (s.side === "BUY" ? -s.sol : s.sol),
          0,
        ),
        advice: `You normally take ${med} trades/day. On ${day.date} you took ${day.swaps.length}, and ${maxRun} losses stacked up as you pushed (${maxRunSol.toFixed(4)} SOL). Past your norm, your edge disappears. Cap the day at ${med} trades, walk away after ${OVERTRADE_LOSS_STREAK} straight losses.`,
      });
    }
  }

  return {
    activeDays,
    medianTradesPerDay: med,
    elevatedDays,
    flaggedDays,
    overtradingPct: elevatedDays ? flaggedDays.length / elevatedDays : null,
    qualityBeyondNorm: {
      withinNormWinRate: withinSells ? withinWins / withinSells : null,
      beyondNormWinRate: beyondSells ? beyondWins / beyondSells : null,
    },
  };
}

module.exports = { buildOvertradingAnalysis };
