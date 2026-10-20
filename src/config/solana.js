require("dotenv").config();
const { Connection } = require("@solana/web3.js");

const rpcUrl =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

const connection = new Connection(rpcUrl, "confirmed");

module.exports = {
  connection,
};
