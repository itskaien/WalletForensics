const {
  DUST_SOL,
  STREAK_MIN,
  STREAK_GAP_HOURS,
  RESTRATEGIZE_GAP_HOURS,
} = require("../config");

function summarize(streak) {
  const first = streak.losses[0];
  const last = streak.losses[streak.losses.length - 1];

  return {
    count: streak.losses.length,
    // check
    totalPnlSol: streak.losses.reduce((s, l) => s + l.pnlSol, 0),
    startTs: first.closeTs,
    endTs: last.closeTs,
    startDate: first.closeDate,
    endDate: last.closeDate,
    durationSeconds: last.closeTs - first.closeTs,
    mints: [...new Set(streak.losses.map((l) => l.mint))],
  };
}

function buildRevengeAnalysis(closedPositions) {
  const closed = closedPositions
    .filter((p) => p.closeTs != null)
    .sort((a, b) => a.closeTs - b.closeTs);

  const streaks = [];
  let current = null;

  const closeCurrent = (endedByWin) => {
    if (current) {
      current.endedByWin = endedByWin;
      streaks.push(current);
      current = null;
    }
  };

  for (const p of closed) {
    const isLoss = p.pnlSol < -DUST_SOL;

    if (!isLoss) {
      closeCurrent(true);
      continue;
    }

    if (
      current &&
      p.closeTs - current.losses[current.losses.length - 1].closeTs <=
        STREAK_GAP_HOURS * 3600
    ) {
      current.losses.push(p);
    } else {
      closeCurrent(false);
      current = { losses: [p], endedByWin: false };
    }
  }
  closeCurrent(false);

  const flaggedStreaks = streaks
    .filter((s) => s.losses.length >= STREAK_MIN)
    .map(summarize);

  const restrategizeFlags = [];
  for (let i = 1; i < streaks.length; i++) {
    const prev = streaks[i - 1];
    const next = streaks[i];
    if (prev.endedByWin) continue;

    const gap =
      next.losses[0].closeTs - prev.losses[prev.losses.length - 1].closeTs;
    if (gap > STREAK_GAP_HOURS * 3600 && gap <= RESTRATEGIZE_GAP_HOURS * 3600) {
      restrategizeFlags.push({
        gapSeconds: gap,
        gapHours: gap / 3600,
        firstStreak: summarize(prev),
        secondStreak: summarize(next),
      });
    }
  }

  const allLosses = closed.filter((p) => p.pnlSol < -DUST_SOL);
  const lossesInFlaggedStreaks = streaks
    .filter((s) => s.losses.length >= STREAK_MIN)
    .reduce((n, s) => n + s.losses.length, 0);

  return {
    totalLosses: allLosses.length,
    streakCount: streaks.length,
    flaggedStreaks,
    restrategizeFlags,

    // step 14 grade
    lossesInFlaggedStreaks,
    revengePct: allLosses.length
      ? lossesInFlaggedStreaks / allLosses.length
      : null,
  };
}

module.exports = { buildRevengeAnalysis };
