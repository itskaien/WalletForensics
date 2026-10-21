const fs = require("node:fs/promises");
const path = require("node:path");

const SOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;

function normalizeSwaps(transactions, walletAddress) {
  const normalizedSwaps = [];
  const unresolved = [];

  for (const tx of transactions) {
    if (tx.transactionError != null || tx.type !== "SWAP") continue;

    const tokenTransfers = (tx.tokenTransfers || []).filter(
      (t) =>
        t.mint !== SOL_MINT &&
        (t.fromUserAccount === walletAddress ||
          t.toUserAccount === walletAddress),
    );

    const tokenMints = [...new Set(tokenTransfers.map((t) => t.mint))];

    if (tokenMints.length !== 1) {
      unresolved.push({
        signature: tx.signature,
        reason: "Expected exactly one non-SOL token mint",
      });
      continue;
    }

    const mint = tokenMints[0];
    const relevantTokens = tokenTransfers.filter((t) => t.mint === mint);

    const tokenIn = relevantTokens
      .filter((t) => t.toUserAccount === walletAddress)
      .reduce((sum, t) => sum + t.tokenAmount, 0);

    const tokenOut = relevantTokens
      .filter((t) => t.fromUserAccount === walletAddress)
      .reduce((sum, t) => sum + t.tokenAmount, 0);

    if (tokenIn > 0 === tokenOut > 0) {
      unresolved.push({
        signature: tx.signature,
        reason: "Token direction is ambiguous",
      });
      continue;
    }

    const side = tokenIn > 0 ? "BUY" : "SELL";
    const tokenQty = tokenIn > 0 ? tokenIn : tokenOut;
    const expectedSolDirection = side === "BUY" ? "OUT" : "IN";

    const wsolMovements = (tx.tokenTransfers || [])
      .filter(
        (t) =>
          t.mint === SOL_MINT &&
          (t.fromUserAccount === walletAddress ||
            t.toUserAccount === walletAddress),
      )
      .map((t) => ({
        amount: t.tokenAmount,
        direction: t.toUserAccount === walletAddress ? "IN" : "OUT",
      }))
      .filter((m) => m.direction === expectedSolDirection && m.amount > 0);

    let sol;

    if (wsolMovements.length > 0) {
      sol = wsolMovements.reduce((sum, m) => sum + m.amount, 0);
    } else {
      const nativeMovements = (tx.nativeTransfers || [])
        .filter(
          (t) =>
            t.fromUserAccount === walletAddress ||
            t.toUserAccount === walletAddress,
        )
        .filter((t) => t.amount > 0)
        .map((t) => ({
          amount: t.amount / LAMPORTS_PER_SOL,
          direction: t.toUserAccount === walletAddress ? "IN" : "OUT",
        }))
        .filter((m) => m.direction === expectedSolDirection);

      if (nativeMovements.length !== 1) {
        unresolved.push({
          signature: tx.signature,
          reason: "Could not uniquely identify the SOL trade amount",
        });
        continue;
      }

      sol = nativeMovements[0].amount;
    }

    if (!Number.isFinite(sol) || sol <= 0 || !Number.isFinite(tokenQty)) {
      unresolved.push({
        signature: tx.signature,
        reason: "Invalid trade amount",
      });
      continue;
    }

    normalizedSwaps.push({
      sig: tx.signature,
      ts: tx.timestamp ?? null,
      date:
        tx.timestamp != null
          ? new Date(tx.timestamp * 1000).toISOString()
          : null,
      mint,
      side,
      sol,
      tokenQty,
    });
  }

  normalizedSwaps.sort((a, b) => {
    if (a.ts == null) return 1;
    if (b.ts == null) return -1;
    return b.ts - a.ts;
  });

  return { normalizedSwaps, unresolved };
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
