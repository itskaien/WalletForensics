const DUST_QTY = 1e-9;
const DUST_SOL = 1e-9;

function buildPositions(swaps) {
  const state = new Map(); // mint -> running position
  const closedPositions = [];
  const orphanSells = [];

  const fresh = () => ({
    qty: 0,
    costBasisSol: 0,
    realizedPnlSol: 0,
    openTs: null,
    lastTs: null,
    buys: 0,
    sells: 0,
    tradedSolIn: 0,
    tradedSolOut: 0,
  });

  for (const s of swaps) {
    if (s.side === "BUY") {
      const st = state.get(s.mint) || fresh();
      st.qty += s.tokenQty;
      st.costBasisSol += s.sol;
      if (st.openTs == null) st.openTs = s.ts;
      st.lastTs = s.ts;
      st.buys += 1;
      st.tradedSolIn += s.sol;
      state.set(s.mint, st);
      continue;
    }

    // SELL
    const st = state.get(s.mint) || fresh();

    if (st.qty <= DUST_QTY) {
      orphanSells.push({
        sig: s.sig,
        ts: s.ts,
        mint: s.mint,
        sol: s.sol,
        tokenQty: s.tokenQty,
        reason: "NO_OPEN_POSITION",
      });
      continue;
    }

    const matchedQty = Math.min(s.tokenQty, st.qty);
    const ratio = matchedQty / s.tokenQty;
    const proceeds = s.sol * ratio;
    const avgCost = st.costBasisSol / st.qty;
    const costOfMatched = avgCost * matchedQty;

    st.realizedPnlSol += proceeds - costOfMatched;
    st.qty -= matchedQty;
    st.costBasisSol -= costOfMatched;
    st.lastTs = s.ts;
    st.sells += 1;
    st.tradedSolOut += proceeds;

    if (s.tokenQty - matchedQty > DUST_QTY) {
      orphanSells.push({
        sig: s.sig,
        ts: s.ts,
        mint: s.mint,
        sol: s.sol * (1 - ratio),
        tokenQty: s.tokenQty - matchedQty,
        reason: "EXCEEDS_OPEN_POSITION",
      });
    }

    if (st.qty <= DUST_QTY) {
      closedPositions.push({
        mint: s.mint,
        openTs: st.openTs,
        closeTs: s.ts,
        openDate:
          st.openTs != null ? new Date(st.openTs * 1000).toISOString() : null,
        closeDate: s.ts != null ? new Date(s.ts * 1000).toISOString() : null,
        buys: st.buys,
        sells: st.sells,
        pnlSol: st.realizedPnlSol,
        tradedSolIn: st.tradedSolIn,
        tradedSolOut: st.tradedSolOut,
        holdSeconds:
          st.openTs != null && s.ts != null ? s.ts - st.openTs : null,
      });
      state.delete(s.mint);
    } else {
      state.set(s.mint, st);
    }
  }

  const openPositions = [...state.entries()].map(([mint, st]) => ({
    mint,
    qty: st.qty,
    costBasisSol: st.costBasisSol,
    avgCostSol: st.qty > 0 ? st.costBasisSol / st.qty : null,
    openTs: st.openTs,
    lastTs: st.lastTs,
    buys: st.buys,
    sells: st.sells,
  }));

  return { closedPositions, openPositions, orphanSells };
}

module.exports = { buildPositions, DUST_QTY, DUST_SOL };
