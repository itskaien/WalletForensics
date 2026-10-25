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
              Self Audit
            </button>
            <button
              type="button"
              className={!isOwner ? "active" : ""}
              onClick={() => setIsOwner(false)}
            >
              External Research
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
