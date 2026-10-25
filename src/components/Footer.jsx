import React from "react";

export default function Footer() {
  return (
    <footer className="app-footer">
      <p>Built with React, Node.js, Prisma, Helius, and OpenAI.</p>
      <p>&copy; {new Date().getFullYear()} Wallet Forensics. Open Source.</p>
    </footer>
  );
}
