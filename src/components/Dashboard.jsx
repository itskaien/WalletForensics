import React from "react";
import ReactMarkdown from "react-markdown"; // <-- Imported here

export default function Dashboard({ data, isOwner }) {
  if (!data) return null;

  return (
    <section className="dashboard">
      <h2>{isOwner ? "Your Profile" : "Wallet Profile"}</h2>

      <div className="grid-container">
        {/* Basic Stats */}
        <div className="card stat-card">
          <span className="label">Win Rate</span>
          <span className="value">
            {(data.stats.winRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="card stat-card">
          <span className="label">Net PnL</span>
          <span
            className={`value ${data.stats.netPnlSol >= 0 ? "positive" : "negative"}`}
          >
            {data.stats.netPnlSol.toFixed(3)} SOL
          </span>
        </div>

        {/* Grades */}
        <div className="card grade-card">
          <span className="label">Revenge Trading</span>
          <span
            className={`grade grade-${data.grades.revengeTrading.grade.replace(/\s/g, "-").toLowerCase()}`}
          >
            {data.grades.revengeTrading.grade}
          </span>
        </div>

        <div className="card grade-card">
          <span className="label">Overtrading</span>
          <span
            className={`grade grade-${data.grades.overtrading.grade.replace(/\s/g, "-").toLowerCase()}`}
          >
            {data.grades.overtrading.grade}
          </span>
        </div>

        <div className="card grade-card">
          <span className="label">Big Loss</span>
          <span
            className={`grade grade-${data.grades.bigLoss.grade.replace(/\s/g, "-").toLowerCase()}`}
          >
            {data.grades.bigLoss.grade}
          </span>
        </div>

        <div className="card grade-card">
          <span className="label">FOMO</span>
          <span
            className={`grade grade-${data.grades.fomo.grade.replace(/\s/g, "-").toLowerCase()}`}
          >
            {data.grades.fomo.grade}
          </span>
        </div>
      </div>

      {/* AI Report using React Markdown */}
      <div className="card report-card">
        <h3>AI Forensic Report</h3>
        <div className="markdown-body">
          <ReactMarkdown>
            {data.reportText || "No report generated."}
          </ReactMarkdown>
        </div>
      </div>
    </section>
  );
}
