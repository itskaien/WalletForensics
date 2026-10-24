const { DUST_SOL, OVERTRADE_FACTOR, MIN_ACTIVE_DAYS } = require("../config");
const { median, utcDay, closeTs, byCloseTime } = require("./analysisUtils");

function buildOvertradingAnalysis({ normalizedSwaps, closedPositions }) {
  const swapsByDay = new Map();
  for (const swap of normalizedSwaps) {
    if (!Number.isFinite(swap.ts)) continue;
    const day = utcDay(swap.ts);
    if (!swapsByDay.has(day)) swapsByDay.set(day, []);
    swapsByDay.get(day).push(swap);
  }

  const activeDays = swapsByDay.size;
  const medianTradesPerDay = median(
    [...swapsByDay.values()].map((swaps) => swaps.length),
  );

  const base = {
    activeDays,
    medianTradesPerDay,
    highVolumeThreshold:
      medianTradesPerDay == null ? null : medianTradesPerDay * OVERTRADE_FACTOR,
    losingDays: 0,
    highVolumeDays: [],
    softNoteDays: [],
    flaggedDays: [],
    overtradingPct: null,
  };

  if (activeDays < MIN_ACTIVE_DAYS) {
    return { ...base, status: "NOT_ENOUGH_DATA" };
  }

  const closesByDay = new Map();
  for (const position of closedPositions) {
    const ts = closeTs(position);
    if (ts == null) continue;
    const day = utcDay(ts);
    if (!closesByDay.has(day)) closesByDay.set(day, []);
    closesByDay.get(day).push(position);
  }

  let losingDays = 0;
  const highVolumeDays = [];
  const softNoteDays = [];
  const flaggedDays = [];

  for (const [date, swaps] of swapsByDay) {
    const dailyCount = swaps.length;
    const closed = (closesByDay.get(date) ?? []).sort(byCloseTime);
    const dailyClosedPnlSol = closed.reduce((sum, p) => sum + p.pnlSol, 0);
    const isLosingDay = closed.length > 0 && dailyClosedPnlSol < -DUST_SOL;
    if (isLosingDay) losingDays += 1;

    const isHighVolume = dailyCount > medianTradesPerDay * OVERTRADE_FACTOR;
    if (!isHighVolume) continue;

    const finalTwo = closed.slice(-2);
    const hardFlag =
      finalTwo.length === 2 && finalTwo.every((p) => p.pnlSol < -DUST_SOL);
    const item = {
      date,
      trades: dailyCount,
      yourNorm: medianTradesPerDay,
      closedPositions: closed.length,
      dailyClosedPnlSol,
      finalTwo: finalTwo.map((p) => ({
        mint: p.mint,
        pnlSol: p.pnlSol,
        closeDate: p.closeDate,
      })),
    };
    highVolumeDays.push(item);

    if (hardFlag) {
      flaggedDays.push({
        ...item,
        advice:
          "This high-activity day ended with two losing closed positions. Take it easy and stop adding trades for the session.",
      });
    } else {
      softNoteDays.push({
        ...item,
        note: "Activity was above your norm, but the required final-two-loss pattern was absent. Take it slower; no hard overtrading flag.",
      });
    }
  }

  return {
    status: "OK",
    activeDays,
    medianTradesPerDay,
    highVolumeThreshold: medianTradesPerDay * OVERTRADE_FACTOR,
    losingDays,
    highVolumeDays,
    softNoteDays,
    flaggedDays,
    // Exact step-14 denominator: losing days, not high-volume days.
    overtradingPct: losingDays ? flaggedDays.length / losingDays : null,
  };
}

module.exports = { buildOvertradingAnalysis };
