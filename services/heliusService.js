const axios = require("axios");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

async function getHeliusTransactions(address) {
  const MAX_SWAPS = 500;
  const LIMIT = 100;
  const MAX_PAGES = 100;

  const url = `https://api-mainnet.helius-rpc.com/v0/addresses/${address}/transactions`;

  const swaps = [];
  const seenSignatures = new Set();
  let beforeSignature;

  for (let page = 0; page < MAX_PAGES && swaps.length < MAX_SWAPS; page++) {
    const params = {
      "api-key": process.env.HELIUS_API_KEY,
      limit: LIMIT,
      type: "SWAP",
      ...(beforeSignature && {
        "before-signature": beforeSignature,
      }),
    };

    let response;

    try {
      response = await axios.get(url, { params });
    } catch (error) {
      const data = error.response?.data;
      const message = data?.error;

      const match =
        typeof message === "string" &&
        message.match(/before-signature.*?([1-9A-HJ-NP-Za-km-z]{32,})/i);

      if (match && match[1] !== beforeSignature) {
        beforeSignature = match[1];
        continue;
      }

      throw error;
    }

    if (!Array.isArray(response.data)) {
      throw new Error("Helius returned an unexpected response.");
    }

    const transactions = response.data;

    if (transactions.length === 0) {
      break;
    }

    for (const transaction of transactions) {
      if (!transaction.signature) continue;
      if (seenSignatures.has(transaction.signature)) continue;

      seenSignatures.add(transaction.signature);
      swaps.push(transaction);

      if (swaps.length >= MAX_SWAPS) break;
    }

    const nextSignature = transactions[transactions.length - 1].signature;

    if (!nextSignature || nextSignature === beforeSignature) {
      break;
    }

    beforeSignature = nextSignature;
  }

  const dataDir = path.join(__dirname, "..", "data");
  await mkdir(dataDir, { recursive: true });

  await writeFile(
    path.join(dataDir, "swaps.json"),
    JSON.stringify(swaps, null, 2),
    "utf8",
  );

  return swaps;
}

module.exports = { getHeliusTransactions };
