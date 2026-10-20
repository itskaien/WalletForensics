const { PublicKey } = require("@solana/web3.js");
const { connection } = require("../src/config/solana");

const SOLANA_BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}\$/;

async function validateForensicAddress(address) {
  if (!address || typeof address !== "string") {
    return {
      isValid: false,
      reason: "MALFORMED_INPUT",
      details: "Address must be a string",
    };
  }
  if (!SOLANA_BASE58_REGEX.test(address)) {
    return {
      isValid: false,
      reason: "INVALID_BASE58_FORMAT",
      details: "String violates Base58 alphabet or length properties.",
    };
  }

  try {
    const pubKey = new PublicKey(address);
    const bytes = pubKey.toBytes();

    if (bytes.length !== 32) {
      return {
        isValid: false,
        reason: "INVALID_BYTE_LENGTH",
        details: "Decoded public key size is out of bounds.",
      };
    }

    const isOnCurve = PublicKey.isOnCurve(bytes);
    const systemProgramId = "11111111111111111111111111111111";
    const isNativeSystemAccount = address === systemProgramId;

    let existOnChain = false;
    let accountType = "UNKNOWN";
    let balanceLamports = 0;

    try {
      const accountInfo = await connection.getAccountInfo(pubKey);
      if (accountInfo !== null) {
        existOnChain = true;
        balanceLamports = accountInfo.lamports;

        if (accountInfo.executable) {
          accountType = "SMART_CONTRACT_PROGRAM";
        } else if (!isOnCurve) {
          accountType = "PROGRAM_DERIVED_ADDRESS_OR_TOKEN_ACCOUNT";
        } else {
          accountType = "USER_WALLET";
        }
      }
    } catch (rpcErr) {
      console.error("Forensic RPC data lookup failed:", rpcErr.message);
      return {
        isValid: true,
        reason: "CRYPTO_PASSED_RPC_DEGRADED",
        profile: {
          isOnCurve,
          isNativeSystemAccount,
          existOnChain: null,
          accountType,
        },
      };
    }
    return {
      isValid: true,
      reason: "SUCCESS",
      profile: {
        isOnCurve,
        isNativeSystemAccount,
        existOnChain,
        accountType,
        balanceSol: balanceLamports / 1_000_000_000,
      },
    };
  } catch (err) {
    return {
      isValid: false,
      reason: "CRYPTOGRAPHIC_DECODE_FAILURE",
      details: err.message,
    };
  }
}

exports.usersSolanaInput = async (req, res) => {
  const { address } = req.body;

  const result = await validateForensicAddress(address);

  if (!result.isValid) {
    return res.status(400).json({
      valid: false,
      error: result.reason,
      details: result.details,
    });
  }
  return res.status(200).json({
    valid: true,
    address: address,
    profile: result.profile,
  });
};
