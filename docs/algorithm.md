## Start V1

1. SetUp Project:

- Create Server
- Install: express, prisma and @prisma/client, axios, dotenv, express-rate-limit, express-validator, supertest and vitest.

2. Create .env file for HELIUS_API_KEY, JUPITER_API_KEY, DATABASE_URL, PORT.

3. Config file with constants

4. Validate input:

- base58, 32 to 44 characters
- Validate
- Bad input: 400

5. Fetch Data:

- Pull parsed tx from helius
- paginated up to a cap
- keep swaps only
- verify endpoint and field names in the helius docs
- save JSON to disk while developing

6. Normalize:

- every swap becomes {sig, ts, mint, side, sol, tokenQty} (unsure yet)
- treat wrapped Sol as Sol
- drop failed or zero-movement swaps
- sort by time

7. Positions:

- per mint
- keep running quantity and cost basis in Sol, including fees
- a sell realizes pnl against average cost.
- position closes when quantity ~= 0
- record openTs, closeTs, and pnlSol

8. Open bags:

- get current prices from Jupiter in batches (check the IDs-per-request limit)
- convert USD to Sol using Sols price
- a missing price means a dead bag, counted separately.

9. Stats:

- total in and out
- win rate
- net pnl
- median hold of winners vs losers
- trades per day

10. Loss(unsure):

- a loss is closed position pnlSol < -DUST_SOL
- partial sells dont count
- unsold bags stay in bag stats

11. Revenge Trading:

- sort closed position by closeTs
- a streak is consecutive losses with no win between, each closing within 4hrs of the previous one
- it counts at STREAK_MIN or more
- if another streak starts after a 4h+ gap but within 24hrs of the last one: flag and advise restrategizing

12. Overtrading:

- group by UTC day
- Count the tokens traded each day, and take the median of those daily counts as his usual.
- A day is high volume if its count is more than 60% above that median (median × 1.6).
- Take that day’s closed positions in time order and look at the last two.
- Flag the day if it’s high volume and both of those last two were losses (above dust). Net PnL doesn’t matter.
- If the last trade of the day was a win, no flag, even if there were losses earlier.
- A high-volume day without that ending gets only the soft “take it slower” note.
- Below a minimum number of trading days, return “not enough data.”

13. Big loss(unsure):

- loss as a percentage of (SOL balance just before + cost basis of open positions)
- If at or above 10%, advise a 24h lockout and count trades made during it.
- Check whether Helius gives balance changes per transaction.

14. Grades:

- revenge % = losses inside flagged streaks ÷ all losses.
- Overtrading % = flagged days ÷ losing days.
- Below MIN_LOSSES, return “not enough data”.
- Bands: - 0 to 10% → Clean - 10 to 30% → Watch it - 30 to 60% → Bad - 60% and up → (High Risk, Gambling)

15. Report:

- v1 sends only the computed numbers to DeepSeek to write text.
- save to the postgres cache
- rate limit by IP
- Database: save one row per scan, tied to the wallet address and a timestamp, with the stats, grades, and report. Don’t overwrite. The newest row also serves as the cache for repeat scans. Add a createdAt index on (address, createdAt)
- localStorage: save the list of wallets this browser has scanned, with the scan time and a short result summary, so the user sees their own history without the server knowing who they are
- Repeat scans: if the wallet’s newest on-chain signature hasn’t changed since the last stored scan, return the stored result instead of recalculating.
