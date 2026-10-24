**Latest design direction — October 24:** Ryan is preparing the marketing site in black and white with neon green/yellow accents. Preserve his actual incoming design and assets; the current earthy app palette is not a constraint on it. Mat/Codex owns reviewing PR27 and integrating Ryan’s work while preserving the working account/review flows. See [marketing integration handoff](docs/MARKETING_INTEGRATION.md). This update supersedes conflicting historical design ownership below.

**Current UI ownership (October 24): Mat explicitly reassigned the main screen, navigation and styles to Codex after confirming Ryan had no unpublished work to preserve. PR 23 is merged and live. This supersedes the historical Ryan assignments below. Hosted acceptance: `docs/CUSTOMER_JOURNEY_ACCEPTANCE.md` (or `CUSTOMER_JOURNEY_ACCEPTANCE.md` from this folder). Coordinate any further UI edits with Mat.**

# Team coding-agent instructions

Start with the coding-agent prompt in README.md and the environment checklist in docs/TEAM_START.md. Read docs/PLAN.md for the canonical strategy, docs/TEAM_BOARD.md for work ownership, and docs/BUILD.md before changing code. docs/PROPOSAL.md points to the current plan; files under docs/archive are historical, not active instructions.

- Setup-only requests: install with `npm ci`, run `npm run setup` and `npm run doctor`, start/reuse `npm run dev`, and verify the UI plus `/api/health`. Report missing variable names without values. A failed doctor check does not prevent the synthetic demo; do not claim live integrations are configured. Do not start unrelated implementation.
- Preserve existing work. Claim a bounded lane with the team; do not rebuild the whole project independently.
- Ryan owns final customer UI/product design: `src/`, `index.html` and public visual assets. Read docs/RYAN_PRODUCT_BRIEF.md. The current UI is an engineering reference, not a required layout; Ryan may replace it while preserving behavior. Other agents must coordinate before editing his lane.
- Mat/Codex owns backend/domain/provider integration and deployment. Coordinate shared/contracts.ts and dependency/build changes across owners. Use branches and small PRs after bootstrap.
- All application code for this submission is written on October 24. Disclose existing services and dependencies; do not represent old application code as today's work.
- Keep all private records synthetic for development. No credentials, environment files or SQLite data in commits.
- The x-demo-role header is local impersonation, not authentication. Hosted mode requires the provisioned team access code, a secure server session and a case grant; it ignores this header. The authenticated presenter may operate all three fictional roles. This is a protected synthetic demo, not verified real-world counterparty identity. Never deploy local development mode or use real client data.
- Amounts use integer cents. Unknown is not zero. Models propose facts; deterministic code calculates and checks versions.
- Preserve the stale-revision rejection and historical-review behavior. A model output, sponsor task or document instruction cannot approve a response.
- Do not claim sponsor integration from environment-variable presence. Run real calls and preserve safe evidence. Never fabricate external findings.
- Run npm test and npm run build for relevant changes. Source/tests, live integrations, deployment and customer outcomes are separate claims.
- Minutes, trading, settlement, autonomous sending and a custom marketplace are outside today's product scope. A sponsor Marketplace listing may still be required; see docs/NICRRON_NINOO_SETUP.md.
