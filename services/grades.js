const {
  MIN_LOSSES,
  GRADE_WATCH_IT,
  GRADE_BAD,
  GRADE_HIGH_RISK,
} = require("../config");

function band(pct) {
  if (pct == null || !Number.isFinite(pct)) {
    return { grade: "N/A", reason: "not enough data" };
  }
  if (pct < 0) throw new Error("Grade percentage cannot be negative");
  // Overtrading can exceed 100%: net daily PnL does not control hard flags yet
  // while the step-14 denominator is losing days only.
  if (pct < GRADE_WATCH_IT) {
    return { grade: "Clean", reason: `below ${GRADE_WATCH_IT * 100}%` };
  }
  if (pct < GRADE_BAD) {
    return {
      grade: "Watch it",
      reason: `${GRADE_WATCH_IT * 100}% to below ${GRADE_BAD * 100}%`,
    };
  }
  if (pct < GRADE_HIGH_RISK) {
    return {
      grade: "Bad",
      reason: `${GRADE_BAD * 100}% to below ${GRADE_HIGH_RISK * 100}%`,
    };
  }
  return {
    grade: "High Risk / Gambling",
    reason: `${GRADE_HIGH_RISK * 100}% or above`,
  };
}

function buildGrades({ revenge, overtrade }) {
  const totalLosses = revenge?.totalLosses ?? 0;
  if (totalLosses < MIN_LOSSES) {
    return {
      status: "NOT_ENOUGH_DATA",
      minimumLosses: MIN_LOSSES,
      totalLosses,
      revengeTrading: { grade: "N/A", reason: "not enough data" },
      overtrading: { grade: "N/A", reason: "not enough data" },
    };
  }

  return {
    status: "OK",
    minimumLosses: MIN_LOSSES,
    totalLosses,
    revengeTrading: {
      ...band(revenge?.revengePct),
      pct: revenge?.revengePct ?? null,
      detail: `${revenge?.lossesInFlaggedStreaks ?? 0} of ${totalLosses} losses are inside flagged rapid-loss clusters`,
    },
    overtrading: {
      ...band(overtrade?.overtradingPct),
      pct: overtrade?.overtradingPct ?? null,
      detail: `${overtrade?.flaggedDays?.length ?? 0} flagged days across ${overtrade?.losingDays ?? 0} losing days`,
    },
    // Big-loss lockouts and FOMO chasing are intentionally not graded here.
  };
}

module.exports = { buildGrades, band };
