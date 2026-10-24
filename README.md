# Second Look

**Before selling a venture-fund investment, understand what changed—and make sure the deal you review is still the deal you are getting.**

Deal Flow @ Betaworks, October 24, 2026. **Track 4: Funds. Submission closes 4 PM Eastern.** Target sponsor award: Best Use of External Data.

## Start here — teammates and coding agents

**Use branch `codex/sponsor-setup` ([PR #1](https://github.com/stratten/vc_hackathon/pull/1)). The setup below is on that branch; do not assume it is already on `main`.**

Paste this into Claude Code, Codex, or your coding agent:

```text
Set up and run https://github.com/stratten/vc_hackathon on branch
codex/sponsor-setup. Read README.md, AGENTS.md, and docs/TEAM_START.md first.
Preserve any existing local changes; use a fresh directory if this checkout
belongs to another task. Do not rebuild the app or replace its configuration.

Check Node is 22.13+; use npm ci, npm run setup, and npm run doctor.
setup must not overwrite an existing .env.local. Use credentials already
in the environment; never print, commit, or put them in browser code.
If doctor reports missing settings, list their NAMES only. Continue with
the local synthetic demo; do not invent keys or claim live integrations work.

Start npm run dev, reusing an existing server for this checkout if present.
Check /api/health on port 3001 and open the UI on port 5173. In Codespaces,
keep forwarded port 5173 private. Read docs/TEAM_START.md for live verification.
Report the branch/commit, working URL, missing settings, and which checks
actually passed. Stop after setup unless I assign you an implementation lane.
```

### Run locally

From a **new directory**, with access to the private GitHub repository:

```sh
git clone --branch codex/sponsor-setup https://github.com/stratten/vc_hackathon.git
cd vc_hackathon
node --version                 # must be 22.13 or newer
npm ci
npm run setup                 # creates .env.local only when missing
npm run doctor                # lists configured/missing variable names only
npm run dev                   # run even if doctor reports missing credentials
```

For an existing clean checkout: `git fetch origin`, `git switch codex/sponsor-setup`, then `git pull --ff-only`. Preserve dirty work; never reset or overwrite it to follow these instructions.

Open **http://localhost:5173**. The API is **http://127.0.0.1:3001/api/health**. `npm run dev` starts the UI, API, and configured Roundtable reviewer together; you do not need to launch the sponsor template or Roundtable CLI. Each clone keeps its own case in `.local/second-look.sqlite`, surviving restarts.

### What works while credentials are being arranged?

| Mode | What you can do | What is needed |
| --- | --- | --- |
| Local synthetic demo | Switch roles, answer the question, approve, change offer terms, see the old approval become historical | No provider keys |
| Live company research | Search Akta and save dated findings | `AKTA_API_KEY` |
| Complete live review | Send a saved finding through Roundtable → Nicrron; retrieve and explicitly share the question | Akta, Nicrron, and all four Roundtable settings below |
| All four sponsor integrations | Not complete yet | PRISM integration is still outstanding |

**Credential status:** Mat is waiting for repository admin access. Akta and Nicrron keys are saved in **Actions secrets**, but **Codespaces secrets are not yet provisioned**. Cloning does not download keys. Roundtable also needs separate team-only credentials; do not reuse Mat's reporting credentials. See [the current access checklist](docs/TEAM_START.md).

For live review, `npm run doctor` checks these server-side settings:

```text
AKTA_API_KEY
NICRRON_API_KEY
ROUNDTABLE_APP_KEY
ROUNDTABLE_WORKER_KEY
ROUNDTABLE_WORKER_ID
ROUNDTABLE_PROJECT
```

Use an ignored `.env.local` for local development, or environment injection in Codespaces. `NICRRON_MODEL` is optional and defaults to `nicrron/fastest`. Restart the API after changing credentials. A missing-setting result from `doctor` is expected until provisioning finishes; it is not a reason to rewrite the app.

### Prefer a browser-based development environment?

Select **`codex/sponsor-setup` → Code → Codespaces → Create codespace**. The checked-in devcontainer installs dependencies and runs setup. Run `npm run doctor`, then `npm run dev`, and open forwarded port **5173** with **Private** visibility. The Codespaces route still needs the credential provisioning above; it has not yet been verified in a teammate's Codespace.

This is a working synthetic development app. Akta, Nicrron and Roundtable are integrated; PRISM and optional X1 reads remain outstanding. The role selector is development impersonation, **not authentication**. Do not expose the server publicly or use real client data. The entrypoint refuses production mode until real participant authentication is implemented.

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
| Persistent offer versions, question/answer and historical review | Confirm materiality and connect the remaining sponsors |
| Akta company search, discovery, enrichment and dated news API | Materiality review of external findings; a company mention is not a valuation |
| Integer-cent calculations and unknown-total handling | PRISM trace for the actual Nicrron model request |
| Atomic stale-revision rejection | Authenticated participants and case-scoped sharing |
| Role-specific response projection | Deployment with persistent storage and real auth |
| Tests for changed terms, stale requests and restart continuity | Source extraction/correction, final rehearsal, video and founder brief |

## Use the live research flow

With Akta, Nicrron and Roundtable credentials configured, `npm run dev` starts the UI, API and app-specific Roundtable reviewer together. In Investor view:

1. Search for a company and explicitly choose the right match.
2. Choose the report cutoff and select **Find changes since report**.
3. Choose a dated article and select **Request Roundtable review**.
4. The saved task completes in the background. Reloading the page preserves it.
5. Read the proposed question and source versions, then **Share question with fund manager**.
6. Switch to Fund manager: the shared question and article link are visible. A new answer is needed before the investor can approve again.

A changed case makes earlier research historical. The reviewer validates source/date fields, then calls Nicrron for a proposed question and explanation. It does not assess fair value or verify the publisher's claim. PRISM tracing remains outstanding.

## Team access and credentials

**Cloning the repo does not download secrets.** Akta and Nicrron secrets in GitHub Actions are available only to authorized workflows, not retrievable as a local environment file. This setup has no publicly deployed shared app yet.

For local development, run `npm run setup` to create `.env.local` without overwriting it, then configure Akta, `NICRRON_API_KEY`, plus `ROUNDTABLE_APP_KEY`, `ROUNDTABLE_WORKER_KEY`, `ROUNDTABLE_WORKER_ID`, and `ROUNDTABLE_PROJECT`. The app and reviewer need separate bot identities with access to the same project. Obtain these from your team's approved credential channel or provision your own Roundtable workspace. Never commit credentials. The live setup on Mat's machine uses a private runtime env file and will not exist on a teammate's clone.

Roundtable credentials used on Mat's machine remain server-local; they are **not** in GitHub secrets. These provider grants can access the workspace beyond this app's folder, so they are not a safe substitute for a narrowly scoped team credential. Use a dedicated demo workspace before distributing keys. The personal reporting key is never needed by the app.

A future deployed app can hold the provider keys on its server so teammates use the UI without receiving them. Participant authentication and persistent deployment storage are still required; the current server deliberately remains loopback-only.

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

New app code was written on build day. X1 is proposed existing infrastructure. Confirm the organizer's interpretation of existing-service use; use all four required sponsors for prize eligibility. Observed Akta/Nicrron/Roundtable checks are documented in [sponsor setup](docs/SPONSOR_SETUP.md); they do not establish full sponsor eligibility, customer validation, fair value or financial gain.

No project license or ownership allocation is implied by this bootstrap. Agree those with the team before publishing code under a license. Never commit `.env`, `.local`, credentials, or private financial records.
