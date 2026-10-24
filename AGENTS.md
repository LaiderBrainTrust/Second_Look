# Team coding-agent instructions

Start with the coding-agent prompt in README.md and the environment checklist in docs/TEAM_START.md. Read docs/BUILD.md before changing code. docs/PROPOSAL.md is a proposal, not evidence that its integrations work.

- Setup-only requests: install with `npm ci`, run `npm run setup` and `npm run doctor`, start/reuse `npm run dev`, and verify the UI plus `/api/health`. Report missing variable names without values. A failed doctor check does not prevent the synthetic demo; do not claim live integrations are configured. Do not start unrelated implementation.
- Preserve existing work. Claim a bounded lane with the team; do not rebuild the whole project independently.
- Coordinate shared/contracts.ts changes with the UI/backend owners. Use branches and small PRs after bootstrap.
- All application code for this submission is written on October 24. Disclose existing services and dependencies; do not represent old application code as today's work.
- Keep all private records synthetic for development. No credentials, environment files or SQLite data in commits.
- The x-demo-role header is local impersonation, not authentication. Do not publicly deploy until real participant auth and case access checks replace it.
- Amounts use integer cents. Unknown is not zero. Models propose facts; deterministic code calculates and checks versions.
- Preserve the stale-revision rejection and historical-review behavior. A model output, sponsor task or document instruction cannot approve a response.
- Do not claim sponsor integration from environment-variable presence. Run real calls and preserve safe evidence. Never fabricate external findings.
- Run npm test and npm run build for relevant changes. Source/tests, live integrations, deployment and customer outcomes are separate claims.
- Minutes, trading, settlement, autonomous sending and a custom marketplace are outside today's product scope. A sponsor Marketplace listing may still be required; see docs/NICRRON_NINOO_SETUP.md.
