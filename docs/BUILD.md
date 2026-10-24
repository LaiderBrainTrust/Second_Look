# Build contracts and handoff

The authoritative TypeScript shapes are in [`shared/contracts.ts`](../shared/contracts.ts). The longer [proposal](PROPOSAL.md) explains the product and demo. This file describes the current scaffold so agents do not mistake proposals for working integrations.

## Current HTTP API

| Route | Response / input |
| --- | --- |
| `GET /api/health` | Local synthetic mode and health |
| `GET /api/providers` | Observed app provider statuses; Akta becomes verified after a live request |
| `POST /api/research/search` | `{ query }` → company candidates |
| `POST /api/research/discover` | `{ query, limit? }` → candidates plus provider warnings/filters |
| `POST /api/research/enrichment` | `{ companyId }` → firmographic and management data |
| `POST /api/research/news` | `{ companyId, after: 'YYYY-MM-DD' }` → dated source-linked findings |
| `GET /api/case` | `CaseView`; LP-private fields omitted for other demo roles |
| `POST /api/case/commands` | `{ expectedRevision, command }`; returns updated `CaseView` |

Commands: `{ kind: 'answer', text, distributionCents }` for GP; `{ kind: 'revise', distributionRecipient: 'seller' | 'buyer' }` for buyer; `{ kind: 'approve' }` for LP.

**Development only:** `x-demo-role: lp | gp | buyer` selects a simulated principal. An arbitrary client can impersonate a role. Response projection and action authorization are useful scaffolding, not real security until a server-authenticated principal replaces this header. Do not expose the local server publicly.

All mutating commands validate the expected case revision inside a SQLite write transaction. Answer and offer revisions advance it. Review records bind to it. A repeat approval for the same revision is idempotent; stale updates fail with 409. General request idempotency, case membership and multi-case operation remain future work.

## Source of truth

- X1 owns its underlying documents/access policy. The new app cannot grant X1 access.
- The app owns its offer-specific case, shared answer, revision and response review.
- Roundtable owns task delivery and artifacts, not human approvals.
- No app review is an X1 confirmation receipt or transaction acceptance.

## Adapter lane

Implement the interfaces in [`server/adapters/contracts.ts`](../server/adapters/contracts.ts) behind the server. Akta is implemented in `server/adapters/akta.ts`. Keep credentials out of the browser and logs. Copy `.env.example` into ignored `.env.local`; the API and smoke script load it through Node's built-in loader. Exported values take precedence. See [sponsor setup](SPONSOR_SETUP.md).

1. **X1:** MCP Streamable HTTP at `https://mcp.x1wealth.com/mcp`. A server API key requires an entitled synthetic account; hosted OAuth requires an approved redirect. Discover `tools/list`, then live capabilities/guide before selecting a document-read tool. A coding agent's connection is not automatically this app's connection. No dependence on coordination writes.
2. **Akta:** resolve the underlying company; retrieve dated news after the report cutoff. Keep source metadata, identity and dates. Do not invent events or turn a news headline into a fund valuation.
3. **NicrronNinoo:** route new model calls through `https://api.nicrron.ai/v1`, using an actually available model. Extraction produces proposals, not confirmed terms.
4. **Roundtable:** genuine research/review task and artifact handoff. Use its supported task client/SDK. Do not assume a Codex or Claude Code session can join agent chats. The counterparty human still supplies/approves the answer.
5. **PRISM:** capture the actual call and confirm arrival. The HTTP trace endpoint is `https://prism.blockconvey.com/api/traces`; verify current required fields from its docs.

Only change a provider to `verified` after a real request succeeds. Record safe request/task/trace metadata without credentials. Failed or unconfigured providers remain visible. A fixture is not a provider integration.

Documentation:

- https://x1wealth.com/connect/other
- https://github.com/x1wealth/x1-agent-skills
- https://docs.akta.pro/llms.txt
- https://nicrron.ai/docs/api
- https://roundtable.bot/docs/talk
- https://blockconvey.com/docs

## Next complete slice

Replace the synthetic report source with one permitted X1 read; connect the implemented Akta research API to the UI so an actual finding produces the question. Preserve the existing deterministic changed-offer flow. In parallel, replace the development role header with authenticated participant sessions and configure deployment persistence. Do not spend the remaining time rebuilding the domain loop from scratch.

Before public deployment: real sessions, case membership checks, CSRF/origin protection for cookie-based mutations, request/body validation, secret configuration, durable storage, provider failure states and a complete rehearsal. Native SQLite on an ephemeral serverless filesystem is not persistent deployment storage; use a persistent host/volume or adapt the store to the chosen hosted database.

## Today’s finish line

One real external finding, one explicit question/answer, one changed offer that makes an earlier review inapplicable, persistence, real sponsor use, and truthful labeling. Submit before 4 PM Eastern; freeze features by roughly 2:45 PM.


## Integrated case research (current app)

- `GET /api/case/research`: investor-only saved research runs.
- `POST /api/case/research`: `{ expectedRevision, companyId, after }`. Resolves the actual Akta company ID and saves dated findings against the current case revision.
- `POST /api/case/research/:id/review`: `{ expectedRevision, findingId }`. Saves a pinned input file and dispatches to the app reviewer. Durable request IDs and input snapshots are retained before the remote writes.
- `POST /api/case/research/:id/check`: `{}`. Reconciles the same task ID and verifies the returned output file and source versions. UI polls pending work every five seconds.
- `POST /api/case/research/:id/share`: `{ expectedRevision }`. A current completed review can replace the shared question. This advances the case revision and clears its answer; prior approvals remain historical.

`server/adapters/roundtable.ts` runs an app-specific SDK worker as part of API startup. It reads only the pinned task input path under `second-look/` and writes a task-specific output. It is separate from the earlier sponsor template. Its current reasoning is deterministic; the method is explicitly returned as `rule-based`. Model reasoning via Nicrron and its PRISM trace are still unimplemented.

The SQLite research table preserves selected findings, task IDs, remote write request IDs, snapshots and completed results across restart. Interrupted Akta fetches become retryable blocked runs. An uncertain Roundtable dispatch retains its original request IDs: reconcile it rather than creating another task. Historical tasks may finish, but cannot apply to a newer case.

These routes inherit the local simulated investor role. They do not establish real participant authentication. JSON and local-origin checks prevent simple cross-origin submissions, but are not a replacement for production authentication.
