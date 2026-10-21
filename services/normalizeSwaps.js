const fs = require("node:fs/promises");
const path = require("node:path");

const SOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;

function normalizeSwaps(transactions, walletAddress) {
  const normalizedTransactions = transactions
    .filter((tx) => tx.transactionError == null && tx.type === "SWAP")
    .flatMap((tx) => {
      const tokenMovements = (tx.tokenTransfers || [])
        .filter(
          (transfer) =>
            transfer.mint !== SOL_MINT &&
            (transfer.fromUserAccount === walletAddress ||
              transfer.toUserAccount === walletAddress),
        )
        .map((transfer) => ({
          mint: transfer.mint,
          amount: transfer.tokenAmount,
          direction: transfer.toUserAccount === walletAddress ? "IN" : "OUT",
        }));

      const solMovements = (tx.tokenTransfers || [])
        .filter(
          (transfer) =>
            transfer.mint === SOL_MINT &&
            (transfer.fromUserAccount === walletAddress ||
              transfer.toUserAccount === walletAddress),
        )
        .map((transfer) => ({
          amount: transfer.tokenAmount,
          direction: transfer.toUserAccount === walletAddress ? "IN" : "OUT",
        }));

      const nativeSolMovements = (tx.nativeTransfers || [])
        .filter(
          (transfer) =>
            transfer.fromUserAccount === walletAddress ||
            transfer.toUserAccount === walletAddress,
        )
        .map((transfer) => ({
          amountLamports: transfer.amount,
          amountSOL: transfer.amount / LAMPORTS_PER_SOL,
          direction: transfer.toUserAccount === walletAddress ? "IN" : "OUT",
          from: transfer.fromUserAccount,
          to: transfer.toUserAccount,
        }));

      const hasMovement = [
        ...tokenMovements.map((movement) => movement.amount),
        ...solMovements.map((movement) => movement.amount),
        ...nativeSolMovements.map((movement) => movement.amountLamports),
      ].some((amount) => Number.isFinite(amount) && amount > 0);

      if (!hasMovement) {
        return [];
      }

      return [
        {
          signature: tx.signature,
          timestamp: tx.timestamp ?? null,
          date: tx.timestamp
            ? new Date(tx.timestamp * 1000).toISOString()
            : null,
          walletAddress,
          source: tx.source,
          fee: tx.fee,
          tokenMovements,
          solMovements,
          nativeSolMovements,
        },
      ];
    });
  normalizedTransactions.sort((a, b) => {
    if (a.timestamp == null) return 1;
    if (b.timestamp == null) return -1;

    return b.timestamp - a.timestamp;
  });

  return normalizedTransactions;
}

async function saveNormalizedSwaps(swaps) {
  const dataDir = path.join(__dirname, "..", "data");

  await fs.mkdir(dataDir, { recursive: true });

  await fs.writeFile(
    path.join(dataDir, "normalizedSwaps.json"),
    JSON.stringify(swaps, null, 2),
    "utf8",
  );
}

module.exports = { normalizeSwaps, saveNormalizedSwaps };
