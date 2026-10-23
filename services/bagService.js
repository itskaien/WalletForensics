const axios = require("axios");

const { SOL_MINT } = require("../config");
const BATCH_SIZE = 50; // Jupiter Price API v3 hard limit
const BATCH_DELAY_MS = 1100;
const PRICE_URL = "https://api.jup.ag/price/v3";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPrices(mints) {
  if (!process.env.JUPITER_API_KEY) {
    throw new Error("JUPITER_API_KEY is not set");
  }

  const unique = [...new Set(mints)];
  const prices = {};
  const missing = [];

  const batches = chunk(unique, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const { data } = await axios.get(PRICE_URL, {
      params: { ids: batches[i].join(",") },
      headers: { "x-api-key": process.env.JUPITER_API_KEY },
      timeout: 15_000,
    });

    for (const mint of batches[i]) {
      const entry = data?.[mint];
      if (entry && Number.isFinite(entry.usdPrice) && entry.usdPrice > 0) {
        prices[mint] = entry.usdPrice;
      } else {
        missing.push(mint);
      }
    }

    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  return { prices, missing };
}

async function buildBags(openPositions) {
  if (!openPositions.length) {
    return {
      bags: [],
      deadBags: [],
      solUsdPrice: null,
      totalValueSol: 0,
      totalUnrealizedPnlSol: 0,
      totalDeadCostBasisSol: 0,
    };
  }

  const mints = openPositions.map((p) => p.mint);
  const { prices, missing } = await fetchPrices([...mints, SOL_MINT]);

  if (!(SOL_MINT in prices)) {
    throw new Error(
      "Could not fetch SOL price, refusing to value bags without a unit",
    );
  }
  const solUsdPrice = prices[SOL_MINT];

  const deadSet = new Set(missing);

  const bags = [];
  const deadBags = [];

  for (const p of openPositions) {
    if (deadSet.has(p.mint)) {
      deadBags.push({
        mint: p.mint,
        qty: p.qty,
        costBasisSol: p.costBasisSol,
        avgCostSol: p.avgCostSol,
        openTs: p.openTs,
        lastTs: p.lastTs,
      });
      continue;
    }

    const usdPrice = prices[p.mint];
    const valueUsd = p.qty * usdPrice;
    const valueSol = valueUsd / solUsdPrice;
    const unrealizedPnlSol = valueSol - p.costBasisSol;

    bags.push({
      mint: p.mint,
      qty: p.qty,
      costBasisSol: p.costBasisSol,
      avgCostSol: p.avgCostSol,
      usdPrice,
      valueUsd,
      valueSol,
      unrealizedPnlSol,
      pnlPct:
        p.costBasisSol > 0 ? (unrealizedPnlSol / p.costBasisSol) * 100 : null,
      openTs: p.openTs,
      lastTs: p.lastTs,
    });
  }

  bags.sort((a, b) => a.unrealizedPnlSol - b.unrealizedPnlSol); // worst first

  return {
    bags,
    deadBags,
    solUsdPrice,
    totalValueSol: bags.reduce((s, b) => s + b.valueSol, 0),
    totalUnrealizedPnlSol: bags.reduce((s, b) => s + b.unrealizedPnlSol, 0),
    totalDeadCostBasisSol: deadBags.reduce((s, b) => s + b.costBasisSol, 0),
  };
}

module.exports = { buildBags, fetchPrices };
