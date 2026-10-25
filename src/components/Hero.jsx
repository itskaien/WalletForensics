import React from "react";

export default function Hero({
  address,
  setAddress,
  isOwner,
  setIsOwner,
  handleScan,
  loading,
}) {
  return (
    <section className="hero">
      <h2>Deep behavioral analysis for Solana traders.</h2>
      <p>Understand your trading psychology through on-chain data.</p>

      <form onSubmit={handleScan} className="card form-section">
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter Solana Wallet Address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Scanning..." : "Scan Wallet"}
          </button>
        </div>

        <div className="toggle-group">
          <label>
            <input
              type="radio"
              checked={isOwner}
              onChange={() => setIsOwner(true)}
            />
            This is my wallet
          </label>
          <label>
            <input
              type="radio"
              checked={!isOwner}
              onChange={() => setIsOwner(false)}
            />
            External wallet (Research)
          </label>
        </div>
      </form>
    </section>
  );
}
