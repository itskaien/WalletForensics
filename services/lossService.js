const { DUST_SOL } = require("../config");

function median(nums) {
  const s = nums
    .filter((n) => n != null && Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function buildLossAnalysis(closedPositions) {
  const losses = closedPositions
    .filter((p) => p.pnlSol < -DUST_SOL)
    .sort((a, b) => a.pnlSol - b.pnlSol); // worst first

  const totalLostSol = losses.reduce((s, p) => s + p.pnlSol, 0);
  const medianLossSol = median(losses.map((p) => p.pnlSol));
  const biggest = losses[0] ?? null;

  const top3 = losses.slice(0, 3).reduce((s, p) => s + p.pnlSol, 0);
  const top3Share = totalLostSol < 0 ? top3 / totalLostSol : null; // both negative = positive ratio

  return {
    lossCount: losses.length,
    totalLostSol,
    medianLossSol,
    avgLossSol: losses.length ? totalLostSol / losses.length : null,
    biggestLoss: biggest
      ? {
          mint: biggest.mint,
          pnlSol: biggest.pnlSol,
          openDate: biggest.openDate,
          closeDate: biggest.closeDate,
          holdSeconds: biggest.holdSeconds,
        }
      : null,
    top3ShareOfLosses: top3Share, // 0.6 = "three trades caused 60% of all losses"
    losses: losses.map((p) => ({
      mint: p.mint,
      pnlSol: p.pnlSol,
      openDate: p.openDate,
      closeDate: p.closeDate,
      holdSeconds: p.holdSeconds,
      tradedSolIn: p.tradedSolIn,
    })),
  };
}

module.exports = { buildLossAnalysis };
