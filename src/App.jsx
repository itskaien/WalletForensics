import { useState, useEffect } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Dashboard from "./components/Dashboard";
import DocsSection from "./components/DocsSection";
import Footer from "./components/Footer";
import "./index.css";

function App() {
  const [theme, setTheme] = useState("light");
  const [address, setAddress] = useState("");
  const [isOwner, setIsOwner] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const runScan = async (targetAddress) => {
    setLoading(true);
    setData(null);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(`${API_URL}/api/wallet-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: targetAddress }),
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

  const handleScan = (e) => {
    e.preventDefault();
    runScan(address);
  };

  const handleDemo = () => {
    const demoAddress = "BGr6P4TmHV5Rpt4zPPCz9znPkqyTMPTouDUSFFzXtXAZ";
    setAddress(demoAddress);
    runScan(demoAddress);
  };

  return (
    <div className="app-container">
      <Header toggleTheme={toggleTheme} currentTheme={theme} />

      <main>
        <Hero
          address={address}
          setAddress={setAddress}
          isOwner={isOwner}
          setIsOwner={setIsOwner}
          handleScan={handleScan}
          handleDemo={handleDemo}
          loading={loading}
        />

        {error && <div className="error-message">{error}</div>}

        <Dashboard data={data} isOwner={isOwner} />

        <DocsSection />
      </main>

      <Footer />
    </div>
  );
}

export default App;
