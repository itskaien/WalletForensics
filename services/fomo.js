const { CHASE_WINDOW_HOURS, CHASE_PREMIUM } = require("../config");

function buildFomoAnalysis(normalizedSwaps) {
  const buysByMint = new Map();
  let totalBuySol = 0;

  for (const swap of normalizedSwaps) {
    if (swap.side !== "BUY") continue;
    if (!Number.isFinite(swap.ts) || !(swap.sol > 0) || !(swap.tokenQty > 0)) {
      continue;
    }
    totalBuySol += swap.sol;
    if (!buysByMint.has(swap.mint)) buysByMint.set(swap.mint, []);
    buysByMint.get(swap.mint).push(swap);
  }

  const windowSeconds = CHASE_WINDOW_HOURS * 3600;
  const events = [];

  for (const [mint, buys] of buysByMint) {
    buys.sort((a, b) => a.ts - b.ts);
    let previous = null;
    for (const buy of buys) {
      if (previous) {
        const ageSeconds = buy.ts - previous.ts;
        const previousUnitPrice = previous.sol / previous.tokenQty;
        const unitPrice = buy.sol / buy.tokenQty;
        const premium = unitPrice / previousUnitPrice - 1;
        if (ageSeconds <= windowSeconds && premium >= CHASE_PREMIUM) {
          events.push({
            mint,
            sig: buy.sig,
            date: buy.date ?? new Date(buy.ts * 1000).toISOString(),
            sol: buy.sol,
            previousUnitPriceSol: previousUnitPrice,
            unitPriceSol: unitPrice,
            premiumPct: premium * 100,
            hoursAfterPreviousBuy: ageSeconds / 3600,
          });
        }
      }
      previous = buy;
    }
  }

  events.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const solSpentChasing = events.reduce((sum, event) => sum + event.sol, 0);

  return {
    metricName: "repeatBuyChasing",
    interpretation:
      "Flags repeat buys at a higher execution price; it does not prove FOMO or predict tops.",
    chaseEvents: events.length,
    chasedMintCount: new Set(events.map((event) => event.mint)).size,
    solSpentChasing,
    pctOfBuyVolumeChased:
      totalBuySol > 0 ? solSpentChasing / totalBuySol : null,
    events,
  };
}

module.exports = { buildFomoAnalysis };
