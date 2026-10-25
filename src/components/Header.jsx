import React from "react";

export default function Header({ toggleTheme, currentTheme }) {
  return (
    <header className="app-header">
      <div className="logo">
        <span className="logo-icon">🔍</span>
        <h1>Wallet Forensics</h1>
      </div>
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {currentTheme === "light" ? "🌙 Dark" : "☀️ Light"}
      </button>
    </header>
  );
}
