# Second Look

**Before selling a venture-fund investment, understand what changed—and make sure the deal you review is still the deal you are getting.**

Deal Flow @ Betaworks, October 24, 2026. **Track 4: Funds. Submission closes 4 PM Eastern.** Target sponsor award: Best Use of External Data.

## Start here

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. Requires Node **22.13 or newer** (uses built-in `node:sqlite`). API listens on `127.0.0.1:3001`. SQLite data lives in `.local/second-look.sqlite` and survives restarts. No provider credentials are required to run the local scaffold.

This is a **working local synthetic scaffold**, not the finished hackathon entry. Akta research endpoints are implemented; the other app adapters remain unimplemented. The role selector is development impersonation, **not authentication**. The entrypoint refuses production mode until a teammate replaces that boundary. Do not expose this server to the internet or use real client data.

## Try the core interaction

1. Start as Investor: the $700,000 offer is waiting for a distribution answer.
2. Switch to Fund manager and save the clearly fictional $100,000 response.
3. Switch to Investor: review $800,000 gross receipts and approve the proposed response.
4. Switch to Buyer and assign the distribution to the buyer, keeping purchase payment unchanged.
5. Return as Investor: the old review is historical, gross receipts are $700,000, and the new response needs review. Reload or restart the API: state remains.

These are illustrative contract scenarios with explicit zero purchase-price adjustment. Taxes, fees and timing are excluded. Approval is an app review, not a trade, signature or external send.

## What exists / what remains

| Working locally | Still required for the final entry |
| --- | --- |
| React/TypeScript UI and Express API | Actual X1 reads from a synthetic demo account |
| Persistent offer versions, question/answer and historical review | Connect an actual Akta finding to the case question and UI |
| Akta company search, discovery, enrichment and dated news API | Materiality review of external findings; a company mention is not a valuation |
| Integer-cent calculations and unknown-total handling | Actual Nicrron model request, Roundtable task and PRISM trace |
| Atomic stale-revision rejection | Authenticated participants and case-scoped sharing |
| Role-specific response projection | Deployment with persistent storage and real auth |
| Tests for changed terms, stale requests and restart continuity | Source extraction/correction, final rehearsal, video and founder brief |

## Team documents

- [Detailed proposal and independent-agent review prompt](docs/PROPOSAL.md)
- [Integration/API contracts and work split](docs/BUILD.md)
- [Sponsor setup, shared secret and live research endpoints](docs/SPONSOR_SETUP.md)
- [X1 public builder guide](https://x1wealth.com/build)
- [X1 custom-app connection requirements](https://x1wealth.com/connect/other)

**Minutes is out of today's scope.** We are building one complete interaction, not a generic LP platform.

## Work split

Claim a lane in the team chat before editing. The names below are responsibilities, not claims that someone has accepted them:

- **Mat / Codex initial scaffold:** this bootstrap, financial scenario and X1 integration contract. Initial scaffold completion does not reserve every module forever.
- **UI lane:** `src/`.
- **Domain/auth lane:** `server/app.ts`, `server/domain.ts`, `server/store.ts`, participant authentication and tests.
- **Sponsor lane:** `server/adapters/` and provider-specific tests.
- **Submission lane:** customer evidence, founder brief, demo video and Devpost.

Agree changes to `shared/contracts.ts` with the affected owners first. Use branches and small PRs after the initial bootstrap. Do not overwrite teammates' work or change credentials/provider access to make a demo work.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

## Existing infrastructure and submission disclosure

New app code was written on build day. X1 is proposed existing infrastructure. Confirm the organizer's interpretation of existing-service use; use all four required sponsors for prize eligibility. No claim of live integration, customer validation, fair value or financial gain follows from this scaffold.

No project license or ownership allocation is implied by this bootstrap. Agree those with the team before publishing code under a license. Never commit `.env`, `.local`, credentials, or private financial records.
