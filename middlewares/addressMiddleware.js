const SOLANA_BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function requireValidAddress(req, res, next) {
  const { address } = req.body ?? {};

  if (!address || typeof address !== "string") {
    return res.status(400).json({
      valid: false,
      error: "MALFORMED_INPUT",
      details: "Address must be a string",
    });
  }

  if (!SOLANA_BASE58_REGEX.test(address)) {
    return res.status(400).json({
      valid: false,
      error: "INVALID_BASE58_FORMAT",
      details: "String violates Base58 alphabet or length properties.",
    });
  }

  next();
}

module.exports = { requireValidAddress, SOLANA_BASE58_REGEX };
