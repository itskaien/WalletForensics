const { DUST_SOL } = require("../config");
const { median } = require("./analysisUtils");

function buildLossAnalysis(closedPositions) {
  const losses = closedPositions
    .filter((p) => p.pnlSol < -DUST_SOL)
    .sort((a, b) => a.pnlSol - b.pnlSol);

  const totalLostSol = losses.reduce((sum, p) => sum + p.pnlSol, 0);
  const top3LossSol = losses.slice(0, 3).reduce((sum, p) => sum + p.pnlSol, 0);
  const biggest = losses[0] ?? null;

  return {
    lossCount: losses.length,
    totalLostSol,
    medianLossSol: median(losses.map((p) => p.pnlSol)),
    avgLossSol: losses.length ? totalLostSol / losses.length : null,
    top3ShareOfLosses: totalLostSol < 0 ? top3LossSol / totalLostSol : null,
    biggestLoss: biggest
      ? {
          mint: biggest.mint,
          pnlSol: biggest.pnlSol,
          openDate: biggest.openDate,
          closeDate: biggest.closeDate,
          holdSeconds: biggest.holdSeconds,
          tradedSolIn: biggest.tradedSolIn,
        }
      : null,
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
