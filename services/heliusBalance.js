const axios = require("axios");
const { NATIVE_SOL_PSEUDO_MINT } = require("../config");

async function getNativeSolBalanceAt(walletAddress, time) {
  if (!process.env.HELIUS_API_KEY) throw new Error("HELIUS_API_KEY is not set");
  if (!Number.isInteger(time) || time < 0)
    throw new Error("Invalid historical-balance timestamp");

  const { data } = await axios.get(
    `https://api.helius.xyz/v1/wallet/${walletAddress}/balance-at`,
    {
      params: {
        mint: NATIVE_SOL_PSEUDO_MINT,
        time,
        "api-key": process.env.HELIUS_API_KEY,
      },
      timeout: 20_000,
    },
  );

  // No relevant activity by that time means zero, not a failed lookup.
  if (data.asOf === null) return 0;
  const balance = Number(data.balance);
  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error("Helius returned an invalid historical SOL balance");
  }
  return balance;
}

module.exports = { getNativeSolBalanceAt };
