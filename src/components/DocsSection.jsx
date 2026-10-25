import React from "react";

export default function DocsSection() {
  const features = [
    {
      icon: "🔄",
      title: "Revenge Trading",
      desc: "Detects rapid re-entry after a loss (multiple consecutive losses within 4 hours).",
    },
    {
      icon: "📈",
      title: "Overtrading",
      desc: "Flags days with unusually high volume (1.6x median) followed by consecutive losing trades.",
    },
    {
      icon: "📉",
      title: "Big Loss",
      desc: "Measures maximum portfolio drawdown relative to starting capital, capping grades at 100%.",
    },
    {
      icon: "🏃",
      title: "FOMO",
      desc: "Identifies when you bought a token at a significantly higher price (+50%) than your previous entry within 24h.",
    },
  ];

  return (
    <section id="features" className="features-section">
      <div className="section-header">
        <h3>Methodology & Features</h3>
        <p>
          Wallet Forensics analyzes on-chain behavior to identify trading
          psychology patterns.
        </p>
      </div>
      <div className="features-grid">
        {features.map((f, i) => (
          <div key={i} className="feature-card">
            <span className="feature-icon">{f.icon}</span>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
