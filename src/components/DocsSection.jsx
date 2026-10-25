import React from "react";

export default function DocsSection() {
  const guideSteps = [
    {
      title: "Choose Wallet Mode",
      body: (
        <>
          <p>
            <strong>My Wallet:</strong> The report addresses you directly (e.g.,
            "You lost 5 SOL").
          </p>
          <p>
            <strong>Another Wallet:</strong> The report uses third-person (e.g.,
            "This wallet lost 5 SOL").
          </p>
        </>
      ),
    },
    {
      title: "Paste the Address & Run Scan",
      body: (
        <p>
          Enter any Solana wallet address and click <strong>Run Scan</strong>.
          We pull the latest 100+ trades from the blockchain.
        </p>
      ),
    },
    {
      title: "Read Your Grades",
      body: (
        <p>
          Each metric is graded from <strong>Clean</strong> to{" "}
          <strong>High Risk</strong> based on your trading history and losses.
        </p>
      ),
    },
  ];

  const features = [
    {
      title: "Revenge Trading",
      desc: "You lose money on a trade, and immediately buy another coin within 4 hours to try and win it back.",
    },
    {
      title: "Overtrading",
      desc: "You trade way more than usual on a bad day, often making worse decisions the more you trade.",
    },
    {
      title: "Big Loss",
      desc: "The biggest drop in your total portfolio value. If you lose 50% of your money, this flags it.",
    },
    {
      title: "FOMO (Fear Of Missing Out)",
      desc: "You buy a coin at a much higher price than your last buy, usually because you saw it pumping.",
    },
  ];

  return (
    <div className="docs-wrapper">
      {/* GUIDE: Vertical Timeline, no 3-card grid */}
      <section id="guide" className="guide-section">
        <div className="section-header">
          <h3>Guide</h3>
          <p>Understand what the app does and how to use it.</p>
        </div>

        <div className="guide-timeline">
          {guideSteps.map((step, index) => (
            <div key={index} className="guide-node">
              <div className="guide-marker">
                <span>{index + 1}</span>
              </div>
              <div className="guide-content">
                <h4>{step.title}</h4>
                {step.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* METRICS: Keep cards but make them consistent */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h3>Metrics Explained</h3>
          <p>What each grade actually measures.</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
