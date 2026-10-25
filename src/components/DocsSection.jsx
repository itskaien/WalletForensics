import React from "react";

export default function DocsSection() {
  return (
    <section className="card docs-section">
      <h3>Methodology & Features</h3>
      <p className="muted">
        Wallet Forensics analyzes on-chain behavior to identify trading
        psychology patterns.
      </p>
      <ul>
        <li>
          <strong>Revenge Trading:</strong> Detects rapid re-entry after a loss
          (multiple consecutive losses within 4 hours).
        </li>
        <li>
          <strong>Overtrading:</strong> Flags days with unusually high volume
          (1.6x median) followed by consecutive losing trades.
        </li>
        <li>
          <strong>Big Loss:</strong> Measures maximum portfolio drawdown
          relative to starting capital, capping grades at 100%.
        </li>
        <li>
          <strong>FOMO:</strong> Identifies when you bought a token at a
          significantly higher price (+50%) than your previous entry within 24h.
        </li>
      </ul>
    </section>
  );
}
