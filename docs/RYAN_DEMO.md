# Ryan: present Second Look

## Hosted demo

Target URL: https://x1cloud.tail6fbca0.ts.net/ (check the deployment receipt before claiming it is live).

Open it in a normal browser. No Tailscale, terminal, API keys or repo installation are needed to use the hosted app. Sign in once with the team access code. Mat has it in the ignored `.local/demo-access.txt` on the build host; it is also in the repository's `DEMO_ACCESS_CODE` Codespaces secret for team setup. Share it with presenters/judges privately. It is not a provider API key.

One provisioned presenter account can operate all three fictional roles. The server remembers the chosen role in a secure, expiring session and rejects forged role headers. This is a synthetic demonstration, not verified identities of actual investors or managers. Everyone using the hosted URL shares one saved case: coordinate rehearsal times so another person does not change the offer while Ryan presents.

## Before going on stage

1. Sign in on Ryan's laptop and the venue network. Keep the tab open. Ensure the offer starts with distribution going to the **seller**; otherwise have Mat prepare a new separate rehearsal database without deleting the old one.
2. At step 1 choose **Tiny Glade**. The prepared capture has a completed review for this game and the initial offer; this path needs no new sponsor response. Other games and fresh refreshes use live calls.
3. Keep the saved-evidence path for the timed presentation. New API calls are optional after the core story. If a refresh is running/fails, select **Use previous saved evidence**.
4. Walk through the sequence below out loud with a timer. A code/browser check does not replace Ryan's actual rehearsal.

## 2 minutes 45 seconds

- **0:00–0:25.** “Someone offers you $700,000 for your gaming-fund stake. Before you sell, what exactly are you giving up? Our fund and deal are fictional; the game research comes from real sources, captured earlier today.”
- **0:25–0:55.** Tiny Glade: open player evidence, then Akta's business profile. Ryan explains the game in his own words. “Positive reviews don't tell us who is entitled to the money.” The current sample is not a dramatic deterioration; don't claim it is.
- **0:55–1:20.** Click **Turn evidence into a manager question**. This opens the completed saved review. Show the question and its Roundtable task / PRISM receipt. Click **Share question with fund manager**. “The evidence is tied to this exact offer.”
- **1:20–1:45.** Select **Fund manager**. Click **Insert labeled fictional manager response**, then **Save fictional response**. “For this example, the manager confirms a $100,000 distribution belongs to the interest. That number is a scenario assumption, not something inferred from Steam.”
- **1:45–2:05.** Select **Investor**. Show **$800,000 gross receipts**. Click **Approve this proposed response**. “This records a review. It doesn't send or accept a sale.”
- **2:05–2:25.** Select **Buyer**, click **Assign distribution to buyer**, return to **Investor**. Show **−$100,000 to the seller**, **$700,000 gross receipts**, and old approval no longer current. “Same price, different deal.”
- **2:25–2:45.** Refresh case, open saved approvals and print preview. “The game evidence, question, answer and approval stay attached to the version we actually reviewed.” Ask for a redacted LP transfer case to test this with a real reviewer.

Taxes, fees and timing are excluded; the example explicitly assumes zero purchase-price adjustment. Some contracts offset distributions through price adjustments. Do not generalize the $100,000 scenario to every secondary sale.

## Local fallback

```sh
npm ci
npm run demo
```

Open http://localhost:5173. Stop any existing `npm run dev` first: both use ports 5173/3001. Each `demo` launch creates `.local/rehearsal-*/second-look.sqlite`, preserving previous runs and `.local/second-look.sqlite`. Keep this laptop-local option ready before the venue network fails; a Codespace still requires internet.

The committed capture contains public game/studio research and a real saved sponsor response for the unchanged initial fictional offer. It contains no credentials or client records. Import validates the offer, case version and receipt references rather than rewriting an old approval to fit new terms. Do not call the capture a new API response.

Capture refresh for maintainers: with the configured `npm run dev` worker running and successful gaming evidence saved, `npm run capture:demo -- fixtures/new-capture.json` makes a real new reviewer call for the seed offer. It never overwrites an existing capture. Review the resulting public/synthetic data before committing/replacing the packaged capture.

## Hosting and operations

- Run the built UI and Express API together with `NODE_ENV=production`, `DEMO_ORIGIN` (exact HTTPS origin), a random `DEMO_ACCESS_CODE` of at least 24 characters, and absolute persistent `DEMO_DATABASE`. Optional `PORT`, default 3187. Execute `node --import tsx server/index.ts` from the release directory after `npm ci && npm run build`.
- Only `dist/` is served. Provider credentials stay server-side. `/api` data requires a session; state changes require the exact Origin. Session cookies are Secure, HttpOnly and SameSite=Strict, expire after eight hours, and invalidate on logout/server restart.
- The hosted database must live outside the release directory. A first empty database imports the labeled capture. Existing records are never reset on startup. To stage another run, stop only this service, select a new database filename, restart, and retain the previous file as history.
- The service is for this event's fictional workflow. It is not production financial software, has no real counterparty identity proof, and is not intended for real client data.
- Ninoo supports publishing, but its documented backend is Python and its deployed filesystem is temporary: https://ninoo.ai/docs/builder/backends. The current app needs a persistent Node/SQLite host. Builder/Marketplace eligibility remains a separate sponsor clarification.

## Still a human check

Ryan must open the actual URL and complete one spoken rehearsal on his laptop. The team must confirm Ninoo-specific eligibility, record a ≤3-minute video, and submit the founder brief and correct accessible links. These are not established by automated tests.
