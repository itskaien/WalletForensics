import React from "react";

export default function Hero({
  address,
  setAddress,
  isOwner,
  setIsOwner,
  handleScan,
  handleDemo,
  loading,
}) {
  return (
    <section className="hero-section">
      <div className="hero-container">
        <form onSubmit={handleScan} className="audit-form">
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="Enter Solana wallet address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Scanning..." : "Run Scan"}
            </button>
          </div>

          <div className="mode-selector">
            <button
              type="button"
              className={isOwner ? "active" : ""}
              onClick={() => setIsOwner(true)}
            >
              My Wallet
            </button>
            <button
              type="button"
              className={!isOwner ? "active" : ""}
              onClick={() => setIsOwner(false)}
            >
              External Wallet
            </button>
          </div>

          <div className="hero-actions">
            <p className="hero-help">
              New here? <a href="#guide">Read the guide</a>.
            </p>
            <button
              type="button"
              onClick={handleDemo}
              className="demo-btn"
              disabled={loading}
            >
              Try Demo Wallet
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
