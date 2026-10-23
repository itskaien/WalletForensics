const axios = require("axios");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { MAX_SWAPS } = require("../config");

const LIMIT = 100;
const MAX_PAGES = 100; // safety rail against infinite loops
const CONTINUATION_RE = /parameter set to ([A-Za-z0-9]+)/;

async function getHeliusTransactions(address) {
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions`;

  const swaps = [];
  const seenSignatures = new Set();
  let beforeSignature = null;

  for (let page = 0; page < MAX_PAGES && swaps.length < MAX_SWAPS; page++) {
    const params = {
      "api-key": process.env.HELIUS_API_KEY,
      limit: LIMIT,
      type: "SWAP",
      ...(beforeSignature && { "before-signature": beforeSignature }),
    };

    const { data } = await axios.get(url, { params, timeout: 20_000 });

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const message = typeof data.error === "string" ? data.error : "";
      const match = message.match(CONTINUATION_RE);

      if (match && match[1] && match[1] !== beforeSignature) {
        beforeSignature = match[1]; // skip ahead, keep searching older history
        continue;
      }

      throw new Error(`Helius returned an unexpected response: ${message}`);
    }

    if (!Array.isArray(data)) {
      throw new Error("Helius returned an unexpected response.");
    }

    if (data.length === 0) break; // genuinely out of history

    for (const tx of data) {
      if (!tx.signature || seenSignatures.has(tx.signature)) continue;
      seenSignatures.add(tx.signature);
      swaps.push(tx);
      if (swaps.length >= MAX_SWAPS) break;
    }

    const nextSignature = data[data.length - 1].signature;
    if (!nextSignature || nextSignature === beforeSignature) break;
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
