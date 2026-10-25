const {
  MIN_LOSSES,
  GRADE_WATCH_IT,
  GRADE_BAD,
  GRADE_HIGH_RISK,
  FOMO_WATCH_IT,
  FOMO_BAD,
  FOMO_HIGH_RISK,
  BIGLOSS_WATCH_IT,
  BIGLOSS_BAD,
  BIGLOSS_HIGH_RISK,
} = require("../config");

function clampGradePct(pct) {
  if (pct == null || !Number.isFinite(pct)) return null;
  return Math.min(1, Math.max(0, pct)); // Caps raw 120% to 100%
}

function band(
  pct,
  bands = { watch: GRADE_WATCH_IT, bad: GRADE_BAD, high: GRADE_HIGH_RISK },
) {
  if (pct == null || !Number.isFinite(pct)) {
    return {
      grade: "N/A",
      reason: "not enough data",
      pct: null,
      gradePct: null,
      capped: false,
    };
  }
  const gradePct = clampGradePct(pct);
  const base = { pct, gradePct, capped: pct > 1 };

  if (gradePct < bands.watch)
    return { ...base, grade: "Clean", reason: `<${bands.watch * 100}%` };
  if (gradePct < bands.bad)
    return {
      ...base,
      grade: "Watch it",
      reason: `${bands.watch * 100}%-${bands.bad * 100}%`,
    };
  if (gradePct < bands.high)
    return {
      ...base,
      grade: "Bad",
      reason: `${bands.bad * 100}%-${bands.high * 100}%`,
    };
  return { ...base, grade: "High Risk", reason: `>=${bands.high * 100}%` };
}

function buildGrades({ revenge, overtrade, bigLoss, fomo }) {
  const totalLosses = revenge?.totalLosses ?? 0;

  // We only check MIN_LOSSES for revenge/overtrading.
  // BigLoss and FOMO can still be graded if data exists.
  const hasEnoughLossData = totalLosses >= MIN_LOSSES;

  return {
    status: hasEnoughLossData ? "OK" : "PARTIAL",
    minimumLosses: MIN_LOSSES,
    totalLosses,

    revengeTrading: {
      ...(hasEnoughLossData
        ? band(revenge?.revengePct, {
            watch: GRADE_WATCH_IT,
            bad: GRADE_BAD,
            high: GRADE_HIGH_RISK,
          })
        : { grade: "N/A" }),
      detail: `${revenge?.lossesInFlaggedStreaks ?? 0} of ${totalLosses} losses inside streaks`,
    },

    overtrading: {
      ...(hasEnoughLossData
        ? band(overtrade?.overtradingPct, {
            watch: GRADE_WATCH_IT,
            bad: GRADE_BAD,
            high: GRADE_HIGH_RISK,
          })
        : { grade: "N/A" }),
      detail: `${overtrade?.flaggedDays?.length ?? 0} flagged days across ${overtrade?.losingDays ?? 0} losing days`,
    },

    bigLoss: {
      ...band(bigLoss?.maxObservedLossPct, {
        watch: BIGLOSS_WATCH_IT,
        bad: BIGLOSS_BAD,
        high: BIGLOSS_HIGH_RISK,
      }),
      detail: `Max observed loss: ${(bigLoss?.maxObservedLossPct ?? 0).toFixed(2)} of capital`,
    },

    fomo: {
      ...band(fomo?.pctOfBuyVolumeChased, {
        watch: FOMO_WATCH_IT,
        bad: FOMO_BAD,
        high: FOMO_HIGH_RISK,
      }),
      detail: `Chased ${((fomo?.pctOfBuyVolumeChased ?? 0) * 100).toFixed(1)}% of buy volume`,
    },
  };
}

module.exports = { buildGrades, band, clampGradePct };
