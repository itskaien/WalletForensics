const { PublicKey } = require("@solana/web3.js");
const { connection } = require("../src/config/solana");
const { getHeliusTransactions } = require("../services/heliusService");

const getWalletSwaps = async (req, res) => {
  try {
    const { address } = req.body;
    const swaps = await getHeliusTransactions(address);

    return res.status(200).json({
      success: true,
      count: swaps.length,
      swaps,
    });
  } catch (error) {
    console.error("Failed to fetch wallet swaps:", error.message);

    return res.status(500).json({
      success: false,
      error: "FAILED_TO_FETCH_SWAPS",
    });
  }
};

const SOLANA_BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

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
    const isNativeSystemAccount = address === SYSTEM_PROGRAM_ID;

    let existOnChain = false;
    let accountType = "UNKNOWN";
    let balanceLamports = 0;
    let owner = null;
    let executable = false;
    let hadActivity = null;
    let lastActivitySlot = null;
    let lastActivityTime = null;

    try {
      const accountInfo = await connection.getAccountInfo(pubKey);

      if (accountInfo !== null) {
        existOnChain = true;
        balanceLamports = accountInfo.lamports;
        owner = accountInfo.owner.toBase58();
        executable = accountInfo.executable;
        hadActivity = true;

        if (executable) {
          accountType = "PROGRAM";
        } else if (owner === SYSTEM_PROGRAM_ID) {
          accountType = "USER_WALLET";
        } else if (!isOnCurve) {
          accountType = "PDA";
        } else {
          accountType = "PROGRAM_OWNED_ACCOUNT";
        }
      } else {
        if (isNativeSystemAccount) {
          accountType = "SYSTEM_PROGRAM";
          hadActivity = true;
        } else {
          try {
            const sigs = await connection.getSignaturesForAddress(pubKey, {
              limit: 1,
            });
            hadActivity = Array.isArray(sigs) && sigs.length > 0;

            if (hadActivity) {
              lastActivitySlot = sigs[0].slot ?? null;
              lastActivityTime = sigs[0].blockTime ?? null;
            }
          } catch (histErr) {
            console.error("History lookup failed:", histErr.message);
            hadActivity = null;
          }

          if (isOnCurve) {
            accountType =
              hadActivity === true
                ? "EMPTY_WALLET"
                : hadActivity === false
                  ? "UNUSED_WALLET"
                  : "ON_CURVE_HISTORY_UNKNOWN";
          } else {
            accountType =
              hadActivity === true
                ? "EMPTY_PDA"
                : hadActivity === false
                  ? "UNUSED_PDA"
                  : "OFF_CURVE_HISTORY_UNKNOWN";
          }
        }
      }
    } catch (rpcErr) {
      console.error("Forensic RPC data lookup failed:", rpcErr.message);
      console.error("Full error:", rpcErr);
      return {
        isValid: true,
        reason: "CRYPTO_PASSED_RPC_DEGRADED",
        profile: {
          isOnCurve,
          isNativeSystemAccount,
          existOnChain: null,
          accountType: isOnCurve
            ? "ON_CURVE_RPC_FAILED"
            : "OFF_CURVE_RPC_FAILED",
          hadActivity: null,
          lastActivitySlot: null,
          lastActivityTime: null,
        },
      };
    }

    const balanceSol = Number(balanceLamports) / 1_000_000_000;

    let lastActivityIso = null;
    if (lastActivityTime !== null) {
      lastActivityIso = new Date(Number(lastActivityTime) * 1000);
    }

    return {
      isValid: true,
      reason: "SUCCESS",
      profile: {
        isOnCurve,
        isNativeSystemAccount,
        existOnChain,
        accountType,
        balanceSol,
        owner,
        executable,
        hadActivity,
        lastActivitySlot:
          lastActivitySlot != null ? Number(lastActivitySlot) : null,
        lastActivityTime:
          lastActivityTime != null ? Number(lastActivityTime) : null,
        lastActivityIso,
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

const usersSolanaInput = async (req, res) => {
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
    address,
    profile: result.profile,
  });
};

module.exports = {
  usersSolanaInput,
  getWalletSwaps,
};
