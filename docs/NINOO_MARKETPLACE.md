# Ninoo import and Marketplace submission

Owner: Mat/Codex integration lane. Ryan owns UI/design. No sponsor credentials or private client data are imported.

## Listing copy

**Name:** Second Look

**Tagline:** Follow gaming-fund evidence into the deal you actually approve.

**Description:**

Before selling an interest in a gaming fund, an investor needs more than a summary of an old report. Second Look connects current game and studio evidence to the manager's response and the exact sale terms under review.

Inspect real Steam review samples and Akta company research, turn that evidence into a proposed question through Roundtable and Nicrron, and retain the model-call receipt in PRISM. When the manager answers or the buyer changes a distribution term, the app keeps earlier approvals as history and requires review of the current version.

The interactive example uses a fictional fund, fictional holdings and a fictional $700,000 offer. Its $100,000 distribution is an explicit scenario assumption, not a return forecast or a conclusion inferred from player counts. Saved research is dated and labeled; fresh provider checks are available when the configured services respond.

Built at Deal Flow NYC on October 24, 2026. A team access code is required for the shared presentation instance. This is a hackathon demonstration, not investment advice, a trading service, or an authenticated network of real counterparties. The frontend and API bridge are published through Ninoo; the existing Node backend retains the case and its history.

**Category:** Finance, if available; otherwise Business/Productivity.

**Tags (up to five):** venture-capital, gaming, due-diligence, ai-agents, secondaries

**Remix:** Off pending the team's explicit licensing decision.

## Evidence and boundaries

- All four sponsor APIs have actual app-flow receipts: see DEPLOYMENT_RECEIPT.json.
- Ninoo import: pending authenticated Builder access.
- Ninoo publish: pending import/runtime verification.
- Marketplace submission: pending publish and maker profile.
- Marketplace approval: external human review; submission is not approval.
- Event eligibility: do not claim guaranteed eligibility until the organizer accepts the required Builder/listing evidence. A Marketplace review delay may need an event-specific ruling.

## Builder task

Import the current main branch of https://github.com/LaiderBrainTrust/vc_hackathon.
Read NINOO.md. Preserve the UI for Ryan. Use the existing api/main.py bridge
instead of replacing the working Node/SQLite backend. Confirm the Vite frontend
and Python proxy publish correctly, verify health and auth boundaries, and fix
only necessary platform integration issues. Keep credentials out of prompts.

## Routing and storage

Browser → published Ninoo frontend → same-origin Ninoo `/api` proxy → existing Node API.

The proxy forwards only the Second Look session cookie and selected response headers. It never stores the case or provider credentials. It rejects cross-origin mutations, limits request bodies, uses a fixed upstream, and does not follow redirects. NINOO_APP_ORIGIN is optional if Ninoo preserves the browser's Host; otherwise configure the exact published origin.

## Official references

- Import: https://ninoo.ai/docs/builder/git/
- Publishing: https://ninoo.ai/docs/builder/publishing
- Python backend: https://ninoo.ai/docs/builder/backends
- Marketplace review: https://ninoo.ai/docs/builder/market
