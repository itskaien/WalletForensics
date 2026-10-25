import React from "react";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="logo-icon">🔍</span> Wallet Forensics
          <p>Open-source behavioral analytics for Solana.</p>
        </div>
        <div className="footer-links">
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#docs">Documentation</a>
          </div>
          <div>
            <h4>Resources</h4>
            <a
              href="https://github.com/itskaien/WalletForensics.git"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a href="https://helius.dev" target="_blank" rel="noreferrer">
              Helius API
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Wallet Forensics.</p>
      </div>
    </footer>
  );
}
