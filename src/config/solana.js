const { Connection } = require("@solana/web3.js");

let rpcUrl = "https://api.mainnet-beta.solana.com";

if (process.env.HELIUS_RPC_URL) {
  rpcUrl = process.env.HELIUS_RPC_URL;
} else if (process.env.HELIUS_API_KEY) {
  rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
}

const connection = new Connection(rpcUrl, "confirmed");

module.exports = {
  connection,
};
