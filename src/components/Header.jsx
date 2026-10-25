import React, { useState } from "react";

export default function Header({ toggleTheme, currentTheme }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="logo">
          <span className="logo-icon">🔍</span>
          <span className="logo-text">Wallet Forensics</span>
        </div>

        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#docs">Docs</a>
          <a
            href="https://github.com/itskaien/WalletForensics.git"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>

        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {currentTheme === "light" ? "🌙" : "☀️"}
          </button>

          <button
            className="hamburger"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <a href="#features" onClick={() => setIsMenuOpen(false)}>
            Features
          </a>
          <a href="#docs" onClick={() => setIsMenuOpen(false)}>
            Docs
          </a>
          <a
            href="https://github.com/itskaien/WalletForensics.git"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      )}
    </header>
  );
}
