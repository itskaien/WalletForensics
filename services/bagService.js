const axios = require("axios");

const { SOL_MINT } = require("../config");
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1100;
const PRICE_URL = "https://api.jup.ag/price/v3";

function chunk(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPrices(mints) {
  if (!process.env.JUPITER_API_KEY) {
    throw new Error("JUPITER_API_KEY is not set");
  }

  const uniqueMints = [...new Set(mints)];
  const prices = {};
  const missing = [];
  const batches = chunk(uniqueMints, BATCH_SIZE);

  for (let i = 0; i < batches.length; i += 1) {
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
      status: "OK",
      bags: [],
      unpricedBags: [],
      solUsdPrice: null,
      totalValueSol: 0,
      totalUnrealizedPnlSol: 0,
      totalUnpricedCostBasisSol: 0,
      note: "No open positions inferred from the fetched swap history.",
    };
  }

  const { prices, missing } = await fetchPrices([
    ...openPositions.map((position) => position.mint),
    SOL_MINT,
  ]);

  if (!(SOL_MINT in prices)) {
    throw new Error(
      "Could not fetch SOL price; open-bag SOL valuation is unavailable",
    );
  }

  const solUsdPrice = prices[SOL_MINT];
  const unpricedSet = new Set(missing);
  const bags = [];
  const unpricedBags = [];

  for (const position of openPositions) {
    if (unpricedSet.has(position.mint)) {
      unpricedBags.push({
        mint: position.mint,
        qty: position.qty,
        costBasisSol: position.costBasisSol,
        avgCostSol: position.avgCostSol,
        openTs: position.openTs,
        lastTs: position.lastTs,
        note: "No reliable Jupiter price was returned. This does not prove the token is dead.",
      });
      continue;
    }

    const usdPrice = prices[position.mint];
    const valueUsd = position.qty * usdPrice;
    const valueSol = valueUsd / solUsdPrice;
    const unrealizedPnlSol = valueSol - position.costBasisSol;

    bags.push({
      mint: position.mint,
      qty: position.qty,
      costBasisSol: position.costBasisSol,
      avgCostSol: position.avgCostSol,
      usdPrice,
      valueUsd,
      valueSol,
      unrealizedPnlSol,
      pnlPct:
        position.costBasisSol > 0
          ? (unrealizedPnlSol / position.costBasisSol) * 100
          : null,
      openTs: position.openTs,
      lastTs: position.lastTs,
    });
  }

  bags.sort((a, b) => a.unrealizedPnlSol - b.unrealizedPnlSol);

  return {
    status: "OK",
    bags,
    unpricedBags,
    solUsdPrice,
    totalValueSol: bags.reduce((sum, bag) => sum + bag.valueSol, 0),
    totalUnrealizedPnlSol: bags.reduce(
      (sum, bag) => sum + bag.unrealizedPnlSol,
      0,
    ),
    totalUnpricedCostBasisSol: unpricedBags.reduce(
      (sum, bag) => sum + bag.costBasisSol,
      0,
    ),
    coverageWarning:
      "Bag quantities are inferred from the fetched swap history and may be incomplete when history is capped.",
  };
}

module.exports = { buildBags, fetchPrices };
