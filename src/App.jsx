import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./index.css";

function App() {
  const [address, setAddress] = useState("");
  const [isOwner, setIsOwner] = useState(true); // Toggle state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(`${API_URL}/api/wallet-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to scan wallet. Please check the address.");
      }
    } catch (err) {
      console.error(err);
      setError("Error connecting to backend. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Wallet Forensics</h1>
        <p>Deep behavioral analysis for Solana traders.</p>
      </header>

      {/* Main Form */}
      <section className="card form-section">
        <form onSubmit={handleScan}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter Solana Wallet Address (e.g., BGr6...)"
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

      {error && <div className="error-message">{error}</div>}

      {/* Results */}
      {data && (
        <section className="results-section">
          <h2>{isOwner ? "Your Profile" : "Wallet Profile"}</h2>

          <div className="grid-container">
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

          <div className="card report-card">
            <h3>AI Forensic Report</h3>
            <div className="markdown-body">
              <ReactMarkdown>
                {data.reportText || "No report generated."}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Features Docs */}
      <section className="card docs-section">
        <h3>What do these metrics mean?</h3>
        <ul>
          <li>
            <strong>Revenge Trading:</strong> Detects rapid re-entry after a
            loss.
          </li>
          <li>
            <strong>Overtrading:</strong> Flags days with unusually high volume
            and consecutive losses.
          </li>
          <li>
            <strong>Big Loss:</strong> Measures your maximum portfolio drawdown
            relative to your starting capital.
          </li>
          <li>
            <strong>FOMO:</strong> Identifies when you bought a token at a
            significantly higher price than your previous entry within 24h.
          </li>
        </ul>
      </section>
    </div>
  );
}

export default App;
