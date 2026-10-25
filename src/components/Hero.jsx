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
    <section className="hero-split">
      <div className="hero-content">
        <div className="hero-badge">Forensic Solana Analytics</div>
        <h2 className="hero-title">Stop losing money to bad habits.</h2>
        <p className="hero-subtitle">
          Paste your Solana wallet. We analyze your on-chain history to score
          your drawdowns, revenge trading, and FOMO behavior.
        </p>

        <form onSubmit={handleScan} className="form-section">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter Solana Wallet Address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Analyzing..." : "Scan Wallet"}
            </button>
          </div>

          <div className="toggle-group">
            <label>
              <input
                type="radio"
                checked={isOwner}
                onChange={() => setIsOwner(true)}
              />
              My wallet
            </label>
            <label>
              <input
                type="radio"
                checked={!isOwner}
                onChange={() => setIsOwner(false)}
              />
              External research
            </label>
          </div>
        </form>
      </div>

      <div className="hero-visual">
        <div className="terminal-window">
          <div className="terminal-header">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
            <span className="terminal-title">wallet_forensics_output.json</span>
          </div>
          <div className="terminal-body">
            <pre>
              {`{
  "winRate": 0.345,
  "netPnl": -0.990,
  "grades": {
    "revengeTrading": "Watch it",
    "overtrading": "Watch it",
    "bigLoss": "High Risk",
    "fomo": "Watch it"
  },
  "status": "Analysis Complete"
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
