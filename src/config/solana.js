const { Connection } = require("@solana/web3.js");

const rpcUrl =
  process.env.HELIUS_API_KEY || "https://api.mainnet-beta.solana.com";

const connection = new Connection(rpcUrl, "confirmed");

module.exports = {
  connection,
};
