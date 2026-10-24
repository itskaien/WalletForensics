const {
  DUST_SOL,
  SIZE_APE_MULTIPLE,
  BIG_LOSS_DAY_PCT,
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

function buildBigLossAnalysis({
  closedPositions,
  normalizedSwaps,
  totalSolIn,
}) {
  const closed = closedPositions
    .filter((p) => p.closeTs != null)
    .sort((a, b) => a.closeTs - b.closeTs);

  let peak = 0;
  let peakDate = null;
  let equity = 0;
  let maxDD = { sol: 0, peakDate: null, troughDate: null };

  for (const p of closed) {
    equity += p.pnlSol;
    if (equity > peak) {
      peak = equity;
      peakDate = p.closeDate;
    }
    const dd = peak - equity;
    if (dd > maxDD.sol) {
      maxDD = { sol: dd, peakDate, troughDate: p.closeDate };
    }
  }

  const ddTokens = new Set(
    closed
      .filter(
        (p) => p.closeDate >= maxDD.peakDate && p.closeDate <= maxDD.troughDate,
      )
      .map((p) => p.mint),
  );

  const maxDDPct = totalSolIn > 0 ? maxDD.sol / totalSolIn : null;

  let worstRun = null;
  let run = [];
  for (const p of closed) {
    if (p.pnlSol < -DUST_SOL) {
      run.push(p);
      if (!worstRun || run.length > worstRun.positions.length)
        worstRun = { positions: [...run] };
    } else if (p.pnlSol > DUST_SOL) {
      run = [];
    }
  }

  let worstConsecutiveLossRun = null;
  if (worstRun) {
    const total = worstRun.positions.reduce((s, p) => s + p.pnlSol, 0);
    worstConsecutiveLossRun = {
      consecutiveLosses: worstRun.positions.length,
      tokensInvolved: [...new Set(worstRun.positions.map((p) => p.mint))]
        .length,
      totalSol: total,
      startDate: worstRun.positions[0].closeDate,
      endDate: worstRun.positions[worstRun.positions.length - 1].closeDate,
      pctOfTotalIn: totalSolIn > 0 ? Math.abs(total) / totalSolIn : null,
    };
  }

  const sized = closedPositions.filter((p) => p.tradedSolIn > DUST_SOL);
  const medianSizeSol = median(sized.map((p) => p.tradedSolIn));
  const losses = closedPositions
    .filter((p) => p.pnlSol < -DUST_SOL)
    .sort((a, b) => a.pnlSol - b.pnlSol);
  const biggest = losses[0] ?? null;

  const catastrophicPct = worstConsecutiveLossRun?.pctOfTotalIn ?? maxDDPct;

  return {
    maxDrawdown: {
      sol: maxDD.sol,
      pctOfTotalIn: maxDDPct,
      peakDate: maxDD.peakDate,
      troughDate: maxDD.troughDate,
      tokensInvolved: ddTokens.size,
      activeDays: [
        ...new Set(
          normalizedSwaps.map((s) =>
            new Date(s.ts * 1000).toISOString().slice(0, 10),
          ),
        ),
      ].length,
    },
    worstConsecutiveLossRun,
    isCatastrophic:
      catastrophicPct != null && catastrophicPct >= BIG_LOSS_DAY_PCT,
    biggestSingleLoss: biggest
      ? {
          mint: biggest.mint,
          pnlSol: biggest.pnlSol,
          sizeSol: biggest.tradedSolIn,
          openDate: biggest.openDate,
          closeDate: biggest.closeDate,
          holdSeconds: biggest.holdSeconds,
        }
      : null,
    medianPositionSizeSol: medianSizeSol,
    sizeMultipleOfMedian:
      biggest && medianSizeSol ? biggest.tradedSolIn / medianSizeSol : null,
    wasOversizedApe:
      biggest && medianSizeSol
        ? biggest.tradedSolIn / medianSizeSol >= SIZE_APE_MULTIPLE
        : false,
  };
}

module.exports = { buildBigLossAnalysis };
