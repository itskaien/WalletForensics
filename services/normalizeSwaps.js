const fs = require("node:fs/promises");
const path = require("node:path");

const SOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;

function getNativeDeltaSol(tx, walletAddress) {
  const accountData = Array.isArray(tx.accountData) ? tx.accountData : [];
  const entry = accountData.find((a) => a.account === walletAddress);
  if (!entry || entry.nativeBalanceChange == null) return null;
  const lamports = Number(entry.nativeBalanceChange);
  if (!Number.isFinite(lamports)) return null;
  return lamports / LAMPORTS_PER_SOL;
}

function getWsolDeltas(tx, walletAddress) {
  let external = 0;
  let self = 0;

  for (const t of tx.tokenTransfers || []) {
    if (t.mint !== SOL_MINT) continue;
    if (
      t.fromUserAccount !== walletAddress &&
      t.toUserAccount !== walletAddress
    ) {
      continue;
    }

    if (t.tokenAmount == null) {
      return {
        external: null,
        self: null,
        error: "Missing WSOL transfer amount",
      };
    }
    const amount = Number(t.tokenAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return {
        external: null,
        self: null,
        error: "Invalid WSOL transfer amount",
      };
    }

    if (
      t.fromUserAccount === walletAddress &&
      t.toUserAccount === walletAddress
    ) {
      self += amount; // wrap or unwrap leg, mirror of a native/external leg
    } else if (t.toUserAccount === walletAddress) {
      external += amount;
    } else {
      external -= amount;
    }
  }

  return { external, self, error: null };
}

function getFeeSol(tx) {
  if (tx.fee == null) return null;
  const feeLamports = Number(tx.fee);
  if (!Number.isFinite(feeLamports) || feeLamports < 0) return null;
  return feeLamports / LAMPORTS_PER_SOL;
}

function normalizeSwaps(transactions, walletAddress) {
  const normalizedSwaps = [];
  const unresolved = [];

  const markUnresolved = (tx, reason, details = {}) =>
    unresolved.push({ signature: tx.signature ?? null, reason, ...details });

  for (const tx of transactions) {
    if (tx.transactionError != null || tx.type !== "SWAP") continue;

    const tokenTransfers = (tx.tokenTransfers || []).filter(
      (t) =>
        t.mint !== SOL_MINT &&
        (t.fromUserAccount === walletAddress ||
          t.toUserAccount === walletAddress) &&
        !(
          t.fromUserAccount === walletAddress &&
          t.toUserAccount === walletAddress
        ),
    );

    const tokenMints = [...new Set(tokenTransfers.map((t) => t.mint))];

    if (tokenMints.length !== 1) {
      markUnresolved(
        tx,
        tokenMints.length === 0 ? "NO_TOKEN_MOVEMENT" : "TOKEN_TOKEN_SWAP",
        { mintCount: tokenMints.length },
      );
      continue;
    }

    const mint = tokenMints[0];
    if (typeof mint !== "string" || mint.length === 0) {
      markUnresolved(tx, "INVALID_MINT");
      continue;
    }

    const relevantTokens = tokenTransfers.filter((t) => t.mint === mint);

    let tokenIn = 0;
    let tokenOut = 0;
    let invalidTokenAmount = false;

    for (const t of relevantTokens) {
      if (t.tokenAmount == null) {
        invalidTokenAmount = true;
        break;
      }
      const amount = Number(t.tokenAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        invalidTokenAmount = true;
        break;
      }
      if (t.toUserAccount === walletAddress) tokenIn += amount;
      if (t.fromUserAccount === walletAddress) tokenOut += amount;
    }

    if (invalidTokenAmount) {
      markUnresolved(tx, "INVALID_TOKEN_AMOUNT", { mint });
      continue;
    }

    if (tokenIn > 0 === tokenOut > 0) {
      markUnresolved(tx, "AMBIGUOUS_TOKEN_DIRECTION", {
        mint,
        tokenIn,
        tokenOut,
      });
      continue;
    }

    const side = tokenIn > 0 ? "BUY" : "SELL";
    const tokenQty = side === "BUY" ? tokenIn : tokenOut;

    if (!Number.isFinite(tokenQty) || tokenQty <= 0) {
      markUnresolved(tx, "INVALID_TOKEN_QTY", { mint, tokenQty });
      continue;
    }

    const nativeDelta = getNativeDeltaSol(tx, walletAddress);
    if (nativeDelta == null) {
      markUnresolved(tx, "MISSING_NATIVE_BALANCE_CHANGE", { side });
      continue;
    }

    const wsol = getWsolDeltas(tx, walletAddress);
    if (wsol.error) {
      markUnresolved(tx, wsol.error, { side });
      continue;
    }

    const totalDelta = nativeDelta + wsol.external + wsol.self;

    let sol = null;
    if (side === "BUY" && totalDelta < 0) sol = Math.abs(totalDelta);
    else if (side === "SELL" && totalDelta > 0) sol = totalDelta;

    if (sol == null || !Number.isFinite(sol) || sol <= 0) {
      markUnresolved(tx, "SOL_DELTA_SIGN_MISMATCH", {
        mint,
        side,
        nativeDelta,
        wsolExternal: wsol.external,
        wsolSelf: wsol.self,
        totalDelta,
      });
      continue;
    }

    const timestamp =
      tx.timestamp != null && Number.isFinite(Number(tx.timestamp))
        ? Number(tx.timestamp)
        : null;
    const date =
      timestamp != null && Number.isFinite(new Date(timestamp * 1000).getTime())
        ? new Date(timestamp * 1000).toISOString()
        : null;

    normalizedSwaps.push({
      sig: tx.signature ?? null,
      ts: timestamp,
      date,
      mint,
      side,
      sol,
      tokenQty,
      feeSol: getFeeSol(tx),
      feePayer: tx.feePayer ?? null,
    });
  }

  // Oldest -> newest for Step 7. Missing timestamps go last.
  normalizedSwaps.sort((a, b) => {
    if (a.ts == null && b.ts == null) return 0;
    if (a.ts == null) return 1;
    if (b.ts == null) return -1;
    return a.ts - b.ts;
  });

  const unresolvedByReason = {};
  for (const item of unresolved) {
    unresolvedByReason[item.reason] =
      (unresolvedByReason[item.reason] || 0) + 1;
  }

  return { normalizedSwaps, unresolved, unresolvedByReason };
}

async function saveNormalizedSwaps(result) {
  const dataDir = path.join(__dirname, "..", "data");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, "normalizedSwaps.json"),
    JSON.stringify(result, null, 2),
    "utf8",
  );
}

module.exports = { normalizeSwaps, saveNormalizedSwaps };
