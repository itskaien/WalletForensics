# Wallet Forensics 🔍

On-chain behavioral analysis for Solana traders. Wallet Forensics fetches transaction history for any Solana wallet and runs it through custom algorithmic detectors to grade trading psychology—identifying patterns like Revenge Trading, Overtrading, Drawdowns, and FOMO.

## 🌐 Live Links

- **Frontend App (Vercel):** [wallet-forensics.vercel.app](https://wallet-forensics.vercel.app/)
- **Backend API (Render):** [walletforensics.onrender.com](https://walletforensics.onrender.com)

_(Note: The backend is hosted on Render's free tier. If the app hasn't been used in 15 minutes, the first scan may take 30-50 seconds to wake up the server)._

## 🚀 Features

- **Cryptographic Validation:** Verifies addresses using `@solana/web3.js` (32-byte length, ed25519 curve check, and on-chain RPC existence) before scanning.
- **Revenge Trading:** Detects rapid re-entry after a loss (consecutive losses within 4 hours).
- **Overtrading:** Flags high-volume days (1.6x median) followed by consecutive losing trades.
- **Big Loss (Drawdown):** Measures maximum portfolio drawdown relative to starting capital, capping grades at 100% to prevent mathematical overgrading.
- **FOMO Detection:** Identifies when a user bought a token at a significantly higher price (+50%) than their previous entry within 24h.
- **AI Narrative:** Uses OpenAI (`gpt-4o-mini`) to generate a readable summary of the raw data.
- **Database Caching:** Scans are cached in PostgreSQL based on the latest transaction signature. Repeat scans on the same wallet return instantly without hitting external APIs.
- **One-Click Demo:** Includes a built-in demo wallet so users can test the platform instantly without needing a high-volume address.
- **Share Results:** Users can share their behavioral grades directly to X (Twitter) with a single click.

## 🛠 Tech Stack

- **Frontend:** React, Vite, Vanilla CSS (Responsive, Light/Dark mode)
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL
- **Solana Integration:** `@solana/web3.js`
- **External APIs:** Helius (Transactions & RPC), Jupiter (Prices), OpenAI (Narrative)
- **Testing:** Node.js Native Test Runner, Vitest, Supertest

## 🏗 Architecture Flow

1. **Frontend** sends a POST request to `/api/wallet-report` with a wallet address.
2. **Express Backend** validates the address cryptographically using `@solana/web3.js`.
3. **Cache Check:** Prisma checks PostgreSQL for a recent scan matching the wallet's latest on-chain signature.
4. **Data Fetch:** If no cache exists, Helius pulls the latest 100+ SWAP transactions.
5. **Analysis:** The pipeline normalizes swaps, builds positions, and runs behavioral modules (Revenge, Overtrade, BigLoss, FOMO).
6. **AI & Save:** OpenAI generates a summary, and the result is saved to PostgreSQL.

## 📦 Local Setup

### Prerequisites

- Node.js v18+
- PostgreSQL database running locally

### 1. Backend Setup

```bash
npm install

Create a .env file in the root directory:

env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/walletforensics"
HELIUS_API_KEY="your_helius_key"
JUPITER_API_KEY="your_jupiter_key"
OPENAI_API_KEY="your_openai_key"
HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=your_helius_key"
Run Prisma migrations and start the server:

bash
npx prisma migrate dev
node server.js
2. Frontend Setup
In a new terminal, create a .env file:

env
VITE_API_URL=http://localhost:3000
Start Vite:

bash
npm run dev
🧪 Testing
bash
# Run all tests (Math + API)
npm run test

# Run only the mathematical algorithm tests
npm run test:math

# Run only the API integration tests (Vitest + Supertest)
npm run test:api
🚢 Deployment
Backend (Render): Deployed as a Web Service with a PostgreSQL instance. Build Command: npm install --production=false && npx prisma generate && npx prisma migrate deploy.

Frontend (Vercel): Deployed as a Vite application. VITE_API_URL environment variable points to the Render backend.

📄 License
MIT License. Copyright (c) 2026 kaien.
```
