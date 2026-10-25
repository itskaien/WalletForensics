const fs = require("node:fs/promises");
const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});
const { normalizeSwaps } = require("./services/normalizeSwaps");
const { buildPositions } = require("./services/positions");
const { buildStats } = require("./services/statsService");
const { buildLossAnalysis } = require("./services/lossService");
const { buildRevengeAnalysis } = require("./services/revenge");
const { buildOvertradingAnalysis } = require("./services/overtrade");
const { buildBigLossAnalysis } = require("./services/bigLoss");
const { buildFomoAnalysis } = require("./services/fomo");
const { buildGrades } = require("./services/grades");
const { MAX_SWAPS } = require("./config");

async function analyzeWallet(walletAddress, rawTransactions) {
  const { normalizedSwaps, unresolved, unresolvedByReason } = normalizeSwaps(
    rawTransactions,
    walletAddress,
  );
  const { closedPositions, openPositions, orphanSells } =
    buildPositions(normalizedSwaps);

  const stats = buildStats({ closedPositions, normalizedSwaps });
  const lossAnalysis = buildLossAnalysis(closedPositions);
  const revenge = buildRevengeAnalysis(closedPositions);
  const overtrade = buildOvertradingAnalysis({
    normalizedSwaps,
    closedPositions,
  });
  // Step 13 is asynchronous because it queries historical native-SOL balances.
  const bigLoss = await buildBigLossAnalysis({
    walletAddress,
    closedPositions,
    normalizedSwaps,
  });
  const fomo = buildFomoAnalysis(normalizedSwaps);
  const grades = buildGrades({ revenge, overtrade, bigLoss, fomo });

  return {
    stats,
    lossAnalysis,
    revenge,
    overtrade,
    bigLoss,
    fomo,
    grades,
    coverage: {
      fetchedTransactions: rawTransactions.length,
      capped: rawTransactions.length >= MAX_SWAPS,
      normalizedSwaps: normalizedSwaps.length,
      unresolvedCount: unresolved.length,
      unresolvedByReason,
      orphanSellCount: orphanSells.length,
      openPositionCount: openPositions.length,
      complete:
        rawTransactions.length < MAX_SWAPS &&
        unresolved.length === 0 &&
        orphanSells.length === 0,
    },
  };
}

if (require.main === module) {
  (async () => {
    const walletAddress = process.argv[2];
    if (!walletAddress)
      throw new Error("Usage: node analyzeWallet.js WALLET_ADDRESS");
    const raw = JSON.parse(await fs.readFile("./data/swaps.json", "utf8"));
    const result = await analyzeWallet(walletAddress, raw);
    console.log(JSON.stringify(result, null, 2));
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { analyzeWallet };
