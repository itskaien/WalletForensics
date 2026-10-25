const {
  DUST_SOL,
  DUST_QTY,
  BIG_LOSS_PCT,
  LOCKOUT_SECONDS,
} = require("../config");
const { closeTs, byCloseTime } = require("./analysisUtils");
const { getNativeSolBalanceAt } = require("./heliusBalance");

// Average-cost replay used only to estimate open cost basis immediately before T.
// It does not value open tokens at market price.
function openCostBasisBefore(normalizedSwaps, timestamp) {
  const states = new Map();

  for (const swap of normalizedSwaps) {
    if (!Number.isFinite(swap.ts)) continue;
    if (swap.ts >= timestamp) break;
    if (!(swap.tokenQty > 0) || !(swap.sol > 0)) continue;

    const state = states.get(swap.mint) ?? { qty: 0, costSol: 0 };
    if (swap.side === "BUY") {
      state.qty += swap.tokenQty;
      state.costSol += swap.sol;
    } else if (swap.side === "SELL" && state.qty > DUST_QTY) {
      const matchedQty = Math.min(swap.tokenQty, state.qty);
      const removedCost = state.costSol * (matchedQty / state.qty);
      state.qty -= matchedQty;
      state.costSol = Math.max(0, state.costSol - removedCost);
      if (state.qty <= DUST_QTY) {
        state.qty = 0;
        state.costSol = 0;
      }
    }
    states.set(swap.mint, state);
  }

  let total = 0;
  for (const state of states.values()) total += state.costSol;
  return total;
}

function buildRealizedDrawdown(closed) {
  let equitySol = 0;
  let peakSol = 0;
  let peakIndex = -1;
  let max = {
    sol: 0,
    peakIndex: -1,
    troughIndex: -1,
  };

  closed.forEach((position, index) => {
    equitySol += position.pnlSol;
    if (equitySol > peakSol) {
      peakSol = equitySol;
      peakIndex = index;
    }
    const drawdownSol = peakSol - equitySol;
    if (drawdownSol > max.sol) {
      max = { sol: drawdownSol, peakIndex, troughIndex: index };
    }
  });

  const involved =
    max.troughIndex >= 0
      ? closed.slice(max.peakIndex + 1, max.troughIndex + 1)
      : [];
  const peakPosition = max.peakIndex >= 0 ? closed[max.peakIndex] : null;
  const troughPosition = max.troughIndex >= 0 ? closed[max.troughIndex] : null;

  return {
    name: "closedPositionRealizedPnlDrawdown",
    sol: max.sol,
    peakIsInitialBaseline: max.peakIndex === -1,
    peakDate: peakPosition?.closeDate ?? null,
    troughDate: troughPosition?.closeDate ?? null,
    tokensInvolved: new Set(involved.map((p) => p.mint)).size,
    positionsInvolved: involved.length,
    warning:
      "This is not total portfolio drawdown: open-bag market values and external transfers are excluded.",
  };
}

async function buildBigLossAnalysis({
  walletAddress,
  closedPositions,
  normalizedSwaps,
  balanceProvider = getNativeSolBalanceAt,
}) {
  const closed = closedPositions
    .filter((p) => closeTs(p) != null)
    .sort(byCloseTime);
  const swaps = [...normalizedSwaps].sort((a, b) => a.ts - b.ts);
  const maxDrawdown = buildRealizedDrawdown(closed);

  let equitySol = 0;
  let peakSol = 0;
  let activeLockoutUntil = null;
  let balanceLookupFailures = 0;
  const lossEvents = [];
  const lockouts = [];

  for (const position of closed) {
    equitySol += position.pnlSol;
    peakSol = Math.max(peakSol, equitySol);
    if (position.pnlSol >= -DUST_SOL) continue;

    const triggerTs = closeTs(position);
    const drawdownSol = peakSol - equitySol;
    const event = {
      triggerTs,
      triggerDate:
        position.closeDate ?? new Date(triggerTs * 1000).toISOString(),
      triggerMint: position.mint,
      eventPositionPnlSol: position.pnlSol,
      crossTokenDrawdownSol: drawdownSol,
      nativeSolBefore: null,
      openCostBasisBeforeSol: null,
      capitalBeforeSol: null,
      lossPctOfCapitalBefore: null,
      capitalStatus: "UNAVAILABLE",
      lockoutStarted: false,
    };

    try {
      const beforeTimestamp = Math.max(0, Math.floor(triggerTs) - 1);
      const [nativeSolBefore, openBasis] = await Promise.all([
        balanceProvider(walletAddress, beforeTimestamp),
        Promise.resolve(openCostBasisBefore(swaps, triggerTs)),
      ]);
      if (!(nativeSolBefore >= 0) || !Number.isFinite(nativeSolBefore)) {
        throw new Error("Balance provider returned an invalid SOL balance");
      }
      const capitalBeforeSol = nativeSolBefore + openBasis;
      if (capitalBeforeSol < 0.01) {
        // Using MIN_CAPITAL_SOL
        event.capitalStatus = "UNRELIABLE";
        event.capitalWarning = "Capital too small to compute reliable loss %.";
        event.lossPctOfCapitalBefore = null;
      } else {
        event.lossPctOfCapitalBefore = drawdownSol / capitalBeforeSol;
        event.lossPctOfCapitalBeforeCapped = Math.min(
          1,
          event.lossPctOfCapitalBefore,
        );
        event.capitalWarning =
          event.lossPctOfCapitalBefore > 1
            ? "Loss % > 100%. Historical capital likely incomplete."
            : null;
      }
      event.nativeSolBefore = nativeSolBefore;
      event.openCostBasisBeforeSol = openBasis;
      event.capitalBeforeSol = capitalBeforeSol;
      event.capitalStatus = "OK";
      if (capitalBeforeSol > 0) {
        event.lossPctOfCapitalBefore = drawdownSol / capitalBeforeSol;
      }
    } catch (error) {
      balanceLookupFailures += 1;
      event.capitalError = error.message;
    }

    const qualifies =
      event.lossPctOfCapitalBefore != null &&
      event.lossPctOfCapitalBefore >= BIG_LOSS_PCT;
    const outsideExistingLockout =
      activeLockoutUntil == null || triggerTs >= activeLockoutUntil;

    if (qualifies && outsideExistingLockout) {
      const endTs = triggerTs + LOCKOUT_SECONDS;
      const tradesDuringLockout = swaps.filter(
        // The lockout begins after the triggering close; do not count that close itself.
        (swap) => swap.ts > triggerTs && swap.ts < endTs,
      );
      const lockout = {
        startTs: triggerTs,
        endTs,
        startDate: event.triggerDate,
        endDate: new Date(endTs * 1000).toISOString(),
        lossPctOfCapitalBefore: event.lossPctOfCapitalBefore,
        tradesDuringLockout: tradesDuringLockout.length,
        buysDuringLockout: tradesDuringLockout.filter((s) => s.side === "BUY")
          .length,
        sellsDuringLockout: tradesDuringLockout.filter((s) => s.side === "SELL")
          .length,
        advice: `A cross-token realized drawdown reached ${(BIG_LOSS_PCT * 100).toFixed(0)}% of measured capital. Take a ${(LOCKOUT_SECONDS / 3600).toFixed(0)}-hour lockout before new trades.`,
      };
      lockouts.push(lockout);
      event.lockoutStarted = true;
      activeLockoutUntil = endTs;
    }
    lossEvents.push(event);
  }

  const measuredPcts = lossEvents
    .map((event) => event.lossPctOfCapitalBefore)
    .filter((pct) => pct != null);

  return {
    metricName: "crossTokenRealizedDrawdown",
    capitalDefinition:
      "native SOL immediately before the loss close + reconstructed open-position cost basis immediately before it",
    maxDrawdown,
    maxObservedLossPct: measuredPcts.length ? Math.max(...measuredPcts) : null,
    bigLossThresholdPct: BIG_LOSS_PCT,
    lockoutSeconds: LOCKOUT_SECONDS,
    lockouts,
    lossEvents,
    balanceLookupFailures,
    coverageWarning:
      "Open cost basis reconstructed from capped swap history may be incomplete; failed balance lookups are never treated as zero.",
  };
}

module.exports = {
  buildBigLossAnalysis,
  openCostBasisBefore,
  buildRealizedDrawdown,
};
