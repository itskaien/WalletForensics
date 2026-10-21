const SOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;

function normalizeSwaps(transactions, walletAddress) {
  const successfulSwaps = transactions.filter(
    (tx) => tx.transactionError == null && tx.type === "SWAP",
  );

  return successfulSwaps.flatMap((tx) => {
    const tokenMovements = (tx.tokenTransfers || [])
      .filter((transfer) => transfer.mint !== SOL_MINT)
      .filter(
        (transfer) =>
          transfer.fromUserAccount === walletAddress ||
          transfer.toUserAccount === walletAddress,
      )
      .map((transfer) => ({
        mint: transfer.mint,
        amount: transfer.tokenAmount,
        direction: transfer.toUserAccount === walletAddress ? "IN" : "OUT",
      }));

    const solMovements = (tx.tokenTransfers || [])
      .filter((transfer) => transfer.mint === SOL_MINT)
      .filter(
        (transfer) =>
          transfer.fromUserAccount === walletAddress ||
          transfer.toUserAccount === walletAddress,
      )
      .map((transfer) => ({
        amount: transfer.tokenAmount,
        direction: transfer.toUserAccount === walletAddress ? "IN" : "OUT",
      }));

    const nativeSolMovements = (tx.nativeTransfers || [])
      .filter(
        (transfer) =>
          transfer.fromUserAccount === walletAddress ||
          transfer.toUserAccount === walletAddress,
      )
      .map((transfer) => ({
        amountLamports: transfer.amount,
        amountSOL: transfer.amount / LAMPORTS_PER_SOL,
        direction: transfer.toUserAccount === walletAddress ? "IN" : "OUT",
        from: transfer.fromUserAccount,
        to: transfer.toUserAccount,
      }));

    const hasMovement = [
      ...tokenMovements.map((movement) => movement.amount),
      ...solMovements.map((movement) => movement.amount),
      ...nativeSolMovements.map((movement) => movement.amountLamports),
    ].some((amount) => amount > 0);

    if (!hasMovement) {
      return [];
    }

    return {
      signature: tx.signature,
      timestamp: tx.timestamp,
      date: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null,
      walletAddress,
      source: tx.source,
      fee: tx.fee,
      status: tx.transactionError == null ? "SUCCESS" : "FAILED",
      tokenMovements,
      solMovements,
      nativeSolMovements,
    };
  });
}

module.exports = { normalizeSwaps };
