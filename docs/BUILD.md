# Implementation contract — Second Look

Product authority: [PLAN.md](PLAN.md). Work claims: [TEAM_BOARD.md](TEAM_BOARD.md). Setup: [TEAM_START.md](TEAM_START.md). Demo: [GAMING_BUILD.md](GAMING_BUILD.md).

## Stack and authority

React 19 + Vite 6; Express 5; TypeScript/ESM; Node 22.13+; native SQLite. `npm run dev` starts UI 5173, API 3001 and the configured Roundtable worker. Use `npm ci`, not a new scaffold. The app is one fictional case per clone, persisted in ignored `.local/second-look.sqlite`.

- SQLite owns the case, offer revision, manager response, approvals, evidence snapshots and research-run state.
- Roundtable owns task delivery and versioned input/output artifacts. A completed task is a proposal, not a human approval.
- Nicrron generates question/explanation prose. It does not own IDs, prices, ownership, distributions or approvals.
- PRISM stores a trace of that actual model call. A trace is not proof of factual correctness.
- Steam/Akta are external evidence providers; source identity, retrieval dates, sample coverage and uncertainty remain visible.
- X1 is not connected. If added, X1 would retain authority over its own source records and access policy; the app cannot grant itself access.

## File map

| Files | Responsibility |
| --- | --- |
| `shared/contracts.ts`, `server/domain.ts` | Case/role/offer types, integer-cent math, revision checks, response projection and historical approvals |
| `shared/gaming.ts`, `server/gaming.ts` | Fixed fictional exposure catalog, profile normalization, investigation ordering, evidence-to-research handoff |
| `server/adapters/steam.ts` | Bounded dated review samples, app credits and current-player observation |
| `server/adapters/akta.ts` | Company resolution, firmographics, discovery and dated company-matched news |
| `server/store.ts` | SQLite transactions; persistent cases, research runs and gaming snapshots; restart recovery |
| `server/case-research.ts` | Prepare/dispatch/check/share state transitions and investor-only access |
| `server/adapters/roundtable.ts` | SDK task dispatch, pinned versions, background reviewer and saved-output verification |
| `server/adapters/nicrron.ts`, `prism.ts` | Model question proposal; real trace and safe failure behavior |
| `server/app.ts`, `index.ts`, `env.ts` | Request validation, local role simulation, server lifecycle, environment loading |
| `src/GamingPanel.tsx`, `ResearchPanel.tsx`, `main.tsx` | Three-step UI, evidence inspection, task status, sharing, role walkthrough and print view |
| `scripts/setup.ts`, `.devcontainer/` | Non-overwriting setup, setting-name-only doctor, private Codespaces development |

## Main API

Local `/api/case` requests use `x-demo-role: lp | gp | buyer`; this is development impersonation. In hosted mode the header is ignored: the secure session owns the role and case grant. Use relative `/api/*` URLs. Mutations require JSON and an allowed origin; hosted requests require the exact configured HTTPS origin.

Hosted UI session contract: `GET /api/session` returns `{ hosted, authenticated, role? }`; `POST /api/session/login` takes `{ code }`; `POST /api/session/role` takes `{ role }`; `POST /api/session/logout` takes `{}`. Login sets the HttpOnly session cookie. Keep it browser/server managed. A 401 should lead back to sign-in; a 409 requires refreshing current state and reviewing the change before retrying. Never auto-approve after a conflict.

Ryan owns UI composition; see [RYAN_PRODUCT_BRIEF.md](RYAN_PRODUCT_BRIEF.md). No backend migration is required for his redesign.

| Route | Contract |
| --- | --- |
| `GET /api/health` | Local synthetic mode and health only; not provider acceptance |
| `GET /api/providers` | Calls observed by this running API process |
| `GET /api/case` | Role-specific CaseView; investor-private fields omitted for other roles |
| `POST /api/case/commands` | `{ expectedRevision, command }`; atomic domain change |
| `GET /api/case/gaming` | Investor-only latest snapshot, catalog and fictional-ownership disclosure |
| `POST /api/case/gaming/refresh` | `{ expectedRevision }`; persist `fetching`, return 202, fetch external evidence, save `ready` or `blocked` |
| `POST /api/case/gaming/:snapshotId/prepare` | `{ expectedRevision, holdingId }`; prepare a research run using saved evidence and the current offer revision; reuse same snapshot/holding/revision run |
| `GET /api/case/research` | Investor-only saved research runs |
| `POST /api/case/research` | `{ expectedRevision, companyId, after }`; general Akta research outside fixed catalog |
| `POST /api/case/research/:id/review` | `{ expectedRevision, findingId }`; persist pinned input/request IDs before Roundtable dispatch |
| `POST /api/case/research/:id/check` | `{}`; reconcile the existing task, verify exact source/output versions, accept matching result; can safely recheck a blocked result |
| `POST /api/case/research/:id/share` | `{ expectedRevision }`; explicit investor share, advances case revision, clears previous answer, retains historical approvals |

Commands:

- GP: `{ kind: 'answer', text, distributionCents }`.
- Buyer: `{ kind: 'revise', distributionRecipient: 'seller' | 'buyer' }`.
- Investor: `{ kind: 'approve' }`.

General Akta endpoints: `POST /api/research/search {query}`, `/discover {query, limit?}`, `/enrichment {companyId}`, `/news {companyId, after}`. These call fixed provider origins; do not add arbitrary URL fetches.

## Financial and evidence invariants

- Amounts are non-negative, bounded, safe integer cents. Unknown is not zero.
- Gross receipts are unresolved until a distribution response and explicit purchase-price adjustment exist.
- The fictional scenario computes purchase payment + explicit price adjustment + distribution if retained by the seller. It does not model tax, fees, dates, carry or other contract provisions.
- Answer and offer changes advance case revision. Approval binds to one revision; stale commands fail with 409. A repeated approval for the same version is idempotent.
- A term change saves the previous offer and before/after gross amounts at that moment. It does not rewrite an old approval.
- `fundNavExposurePercent` is a fictional share of fund NAV, never equity ownership or revenue entitlement. Older `exposurePercent` snapshots are normalized when read; history is not deleted.
- Steam samples are bounded, English-only, date-filtered and deduplicated; comparisons require at least 20 reviews in each window. Current players are not growth. Missing evidence cannot become an invented score or price.
- Akta news must match the selected company ID and fall after the report cutoff. A profile is provider research, not a verified cap table.
- Model input is untrusted evidence, never executable instructions. Model output cannot mutate authoritative financial fields.

## Durable review and failure paths

1. Save a research run and request IDs in SQLite.
2. Write `second-look/{caseId}/{runId}/input.json` to Roundtable and retain its version.
3. Assign a task to the configured reviewer identity with the pinned input reference.
4. The worker validates the input, calls Nicrron, attempts a PRISM trace, and saves `second-look/reviews/{taskId}.json`.
5. Retrieve the task and read the exact output version. Verify case/revision/finding, question, explanation, model IDs and trace status/ID. Compare trace fields by meaning, not JSON property order.
6. Only the investor's explicit share command can replace the manager question. Old-case research remains historical; saved evidence can support a new review of current terms.

Interrupted read-only fetches become blocked after restart. An unconfirmed dispatch keeps its original request IDs; reconcile it rather than spawning a duplicate. A failed result check can be rechecked without repeating the model call. A blocked model task still requires fixing its cause and a new research run; rechecking does not manufacture success.

PRISM failure never erases a valid question. The result says `recorded`, `failed` or `not_configured`; only an actual returned trace ID qualifies as recorded. Secrets are headers/server settings, never trace message content.

## Run, verify and release

```sh
npm ci
npm run setup
npm run doctor
npm run dev
```

For changes, run `npm test` then `npm run build`. Current suite: 29 tests, including trace field-order reconciliation and rejection of actual mismatches. Do not repeat provider calls just to replace a saved source with a prettier result.

Check the complete browser flow in GAMING_BUILD.md. Refresh/reopen and confirm persistence. Test the game screen and decision screen on a narrow viewport. A build does not establish live provider access; a local browser pass does not establish hosted authentication or user acceptance.

Before public hosting, replace role impersonation with authenticated identities and case membership, preserve mutation/origin protection, and use persistent deployment storage. SQLite on an ephemeral serverless filesystem is not a durable deployment. Production mode requires explicit hosted configuration: a strong team access code, exact HTTPS origin and persistent database path. Hosted mode ignores x-demo-role and uses the server session role. The authenticated presenter is authorized to simulate all three roles in the fictional case; this is not real counterparty identity proof. See RYAN_DEMO.md for the event deployment. No deployment is implied by a Git push.

## Provider references

- Steam reviews: https://partner.steamgames.com/doc/webapi/IUserReviewsService
- Akta: https://docs.akta.pro/llms.txt
- Nicrron: https://nicrron.ai/docs/api
- Roundtable: https://roundtable.bot/docs/bots
- PRISM: https://blockconvey.com/docs
- Optional X1: https://x1wealth.com/connect/other

## Source-to-decision continuity

Sharing gaming research stores only its game/studio identifiers, research run, snapshot and shared revision in `researchContext`; it does not expose private raw research to counterparties. Replacing the shared question clears this context for non-gaming research and clears the old answer. New approvals snapshot the exact question, answer and game context. Older stored approvals remain readable without those optional fields; their missing history is never fabricated. Tests cover question replacement and database reopening.
