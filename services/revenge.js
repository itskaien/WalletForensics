// const {
//   DUST_SOL,
//   STREAK_MIN,
//   STREAK_GAP_HOURS,
//   RESTRATEGIZE_GAP_HOURS,
// } = require("../config");

// function summarize(streak) {
//   const first = streak.losses[0];
//   const last = streak.losses[streak.losses.length - 1];

//   return {
//     count: streak.losses.length,
//     // check
//     totalPnlSol: streak.losses.reduce((s, l) => s + l.pnlSol, 0),
//     startTs: first.closeTs,
//     endTs: last.closeTs,
//     startDate: first.closeDate,
//     endDate: last.closeDate,
//     durationSeconds: last.closeTs - first.closeTs,
//     mints: [...new Set(streak.losses.map((l) => l.mint))],
//   };
// }

// function buildRevengeAnalysis(closedPositions) {
//   const closed = closedPositions
//     .filter((p) => p.closeTs != null)
//     .sort((a, b) => a.closeTs - b.closeTs);

//   const streaks = [];
//   let current = null;

//   const closeCurrent = (endedByWin) => {
//     if (current) {
//       current.endedByWin = endedByWin;
//       streaks.push(current);
//       current = null;
//     }
//   };

//   for (const p of closed) {
//     const isLoss = p.pnlSol < -DUST_SOL;

//     if (!isLoss) {
//       closeCurrent(true);
//       continue;
//     }

//     if (
//       current &&
//       p.closeTs - current.losses[current.losses.length - 1].closeTs <=
//         STREAK_GAP_HOURS * 3600
//     ) {
//       current.losses.push(p);
//     } else {
//       closeCurrent(false);
//       current = { losses: [p], endedByWin: false };
//     }
//   }
//   closeCurrent(false);

//   const flaggedStreaks = streaks
//     .filter((s) => s.losses.length >= STREAK_MIN)
//     .map(summarize);

//   const restrategizeFlags = [];
//   for (let i = 1; i < streaks.length; i++) {
//     const prev = streaks[i - 1];
//     const next = streaks[i];
//     if (prev.endedByWin) continue;

//     const gap =
//       next.losses[0].closeTs - prev.losses[prev.losses.length - 1].closeTs;
//     if (gap > STREAK_GAP_HOURS * 3600 && gap <= RESTRATEGIZE_GAP_HOURS * 3600) {
//       restrategizeFlags.push({
//         gapSeconds: gap,
//         gapHours: gap / 3600,
//         firstStreak: summarize(prev),
//         secondStreak: summarize(next),
//       });
//     }
//   }

//   const allLosses = closed.filter((p) => p.pnlSol < -DUST_SOL);
//   const lossesInFlaggedStreaks = streaks
//     .filter((s) => s.losses.length >= STREAK_MIN)
//     .reduce((n, s) => n + s.losses.length, 0);

//   return {
//     totalLosses: allLosses.length,
//     streakCount: streaks.length,
//     flaggedStreaks,
//     restrategizeFlags,

//     // step 14 grade
//     lossesInFlaggedStreaks,
//     revengePct: allLosses.length
//       ? lossesInFlaggedStreaks / allLosses.length
//       : null,
//   };
// }

// module.exports = { buildRevengeAnalysis };

const {
  DUST_SOL,
  STREAK_MIN,
  STREAK_GAP_HOURS,
  RESTRATEGIZE_GAP_HOURS,
} = require("../config");
const { closeTs, byCloseTime } = require("./analysisUtils");

function buildRevengeAnalysis(closedPositions) {
  const closed = closedPositions
    .filter((p) => closeTs(p) != null)
    .sort(byCloseTime);
  const gapSeconds = STREAK_GAP_HOURS * 3600;
  const restartSeconds = RESTRATEGIZE_GAP_HOURS * 3600;
  const allLosses = closed.filter((p) => p.pnlSol < -DUST_SOL);

  const runs = [];
  let current = [];
  let previousLoss = null;

  const finishRun = () => {
    if (current.length) runs.push(current);
    current = [];
  };

  for (const position of closed) {
    if (position.pnlSol > DUST_SOL) {
      finishRun();
      previousLoss = null;
      continue;
    }
    if (position.pnlSol >= -DUST_SOL) {
      // Breakeven
      continue;
    }

    const ts = closeTs(position);
    const continues = previousLoss && ts - closeTs(previousLoss) <= gapSeconds;
    if (!continues) finishRun();
    current.push(position);
    previousLoss = position;
  }
  finishRun();

  const flaggedRuns = runs.filter((run) => run.length >= STREAK_MIN);
  const flaggedStreaks = flaggedRuns.map((run) => ({
    startDate:
      run[0].closeDate ?? new Date(closeTs(run[0]) * 1000).toISOString(),
    endDate:
      run[run.length - 1].closeDate ??
      new Date(closeTs(run[run.length - 1]) * 1000).toISOString(),
    lossCount: run.length,
    totalPnlSol: run.reduce((sum, p) => sum + p.pnlSol, 0),
    positions: run.map((p) => ({
      mint: p.mint,
      pnlSol: p.pnlSol,
      closeDate: p.closeDate,
    })),
  }));

  const lossesInFlaggedStreaks = flaggedStreaks.reduce(
    (sum, streak) => sum + streak.lossCount,
    0,
  );

  const restrategizeFlags = [];
  for (let i = 1; i < flaggedRuns.length; i += 1) {
    const previous = flaggedRuns[i - 1];
    const next = flaggedRuns[i];
    if (previous.length < STREAK_MIN || next.length < STREAK_MIN) continue;
    const gap = closeTs(next[0]) - closeTs(previous[previous.length - 1]);
    if (gap >= gapSeconds && gap <= restartSeconds) {
      restrategizeFlags.push({
        previousStreakEnd:
          previous[previous.length - 1].closeDate ??
          new Date(closeTs(previous[previous.length - 1]) * 1000).toISOString(),
        nextStreakStart:
          next[0].closeDate ?? new Date(closeTs(next[0]) * 1000).toISOString(),
        gapHours: gap / 3600,
        advice: `Two rapid loss clusters occurred within ${RESTRATEGIZE_GAP_HOURS} hours. Pause and restrategize before re-entering.`,
      });
    }
  }

  return {
    metricName: "rapidLossClusters",
    interpretation:
      "A behavioral proxy, not proof of emotional revenge trading.",
    totalLosses: allLosses.length,
    lossesInFlaggedStreaks,
    revengePct: allLosses.length
      ? lossesInFlaggedStreaks / allLosses.length
      : null,
    flaggedStreaks,
    restrategizeFlags,
  };
}

module.exports = { buildRevengeAnalysis };
