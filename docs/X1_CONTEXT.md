# Build with X1: funding context for Second Look

Second Look remains its own application and system of record for cases, bids, participants and approvals. X1 is an optional source of selected household/entity document evidence. Required sponsor research integrations remain in place.

## What works without X1

The investor comparison includes an optional **funding need**: owning entity, amount, deadline, available cash, cash as-of date and an explicit assertion that cash is unrestricted, uncommitted and usable by this entity. Quotes now accept purchase-payment and distribution-payment dates. Unknown dates and cash remain unresolved. Cash older than seven days, future-dated cash, past funding deadlines, and a different entity block the comparison.

The result separates eventual nominal proceeds from amounts due by the deadline. A retained distribution arriving later does not fill today's gap. A payment date already in the past requires reconciliation so the same cash is not counted twice. Sufficient entered cash can show that this funding need does not require sale proceeds; it is not a recommendation about selling.

The cash model assumes fees/adjustments occur with the purchase payment. It excludes taxes, financing, collectability and execution risk. The user must supply correct dates and cash constraints. It does not predict closing or establish title.

## Dedicated X1 connection

Current release includes a real MCP read adapter, but **live provider acceptance depends on configuring and verifying the dedicated account**. Tests using a mock reader are not live X1 evidence.

1. Use a dedicated synthetic X1 account with the relevant sample records and API-key entitlement. Do not use Mat's personal household key.
2. Save `X1_API_KEY` as a private server runtime secret. Never use a `VITE_` variable or put it in the browser, a public repository, or the public `/mcp` instructions.
3. Set `X1_CASE_ID` to exactly the Second Look case that may read that synthetic account. The integration is disabled for all other cases. A global key is **not** a multi-user OAuth integration.
4. Restart the server. The investor's **Use evidence from X1** section reports whether configuration exists. That is configuration status, not proof of provider success.
5. Search for the intended document passage. The adapter connects to the fixed `https://mcp.x1wealth.com/mcp` Streamable HTTP endpoint, discovers the mounted own-document search tool, and requests at most three passages. Errors and empty results remain explicit.
6. Inspect an excerpt and select **Copy this excerpt into the private case**. Selection is bound to the investor, case revision and a 15-minute preview. Importing copies only the selected excerpt. It does not infer or fill financial fields, establish ownership, or mutate X1.

The import retains X1's source reference, page when returned, source date, read time and content hash. Read time is not a document date. A hash is change-detection metadata, not a legal verification. URLs/tokens are not persisted in the excerpt. Different retrieved versions remain separate in case history. Copied excerpts do not auto-refresh, and later X1 access revocation does not erase copies already saved in Second Look. Treat these copies as private case data; this prototype does not promise source-linked erasure.

Only LP access can search/read/import. GP and buyer responses omit the excerpts. Browser-authenticated case access remains separate from X1 authentication. No end-user-provided URL or arbitrary MCP tool call is accepted.

Public X1 setup and builder resources: https://x1wealth.com/build and https://x1wealth.com/connect/other.

## Routes and agent support

- `GET /api/cases/:id/funding`: private funding scenario, retained evidence and per-offer deadline results.
- `POST /api/cases/:id/diligence/commands`: `save_funding` with the schema in `shared/funding.ts`; `save_offer` additionally accepts nullable `paymentDate` and `distributionDate` in YYYY-MM-DD.
- `GET /api/cases/:id/x1`: configuration status and retained private excerpts.
- `POST .../x1/search {expectedRevision,query}`: explicit read, no case mutation.
- `POST .../x1/import {expectedRevision,selectionId}`: import one still-current server preview; advances revision and makes older reviews historical.

The example uses equivalent `/api/case/...` routes. Agent tools `secondlook_read_funding` and `secondlook_save_funding` use the same permission/revision rules. X1 search/import remains a browser-owner action in this release. The existing `secondlook_save_offer` accepts the two payment dates.

## Integration status at implementation

The connected free X1 test account was inspected. It permits cited own-document searches but has no API-key entitlement; the specific fund/notice query returned no searchable documents. Mat chose to supply a dedicated synthetic account. Do not promote that probe into proof that this app's dedicated connection is live. Record a successful selected read/import under that account separately.

## Dedicated synthetic fixture (October 24)

A separate `second-look-demo@x1wealth.com` account now exists. Its only grants are member core access and API-key access; the issued connector is `mcp:read` only. Live tool discovery returned no direct write tools and no professional/staff workspace access. The ordinary first-party upload/finalize routes accepted the two PDFs in [`fixtures/x1`](../fixtures/x1). A live own-document passage search returned the capital-call text with page 1 and its X1 source reference. This is a real connected read of **authored fictional documents**, not real investor evidence.

X1 wraps returned excerpts in a typed untrusted-evidence envelope. The adapter validates that envelope and matching document reference, then displays the document name and passage. It does not interpret quoted instructions, infer financial inputs, or invent a document date when X1 returns none.

The local and fallback runtime are configured for `sample-fund`. Repository Actions and Codespaces secrets now include `X1_API_KEY` and `X1_CASE_ID`; new/restarted Codespaces can receive them. They do not populate local clones or Railway automatically. Railway activation requires the project owner to add the same two variables through the private host configuration. Never put the key in a client/Vite setting.

Try searching **capital** or **liquidity** in the investor's “Use evidence from X1” section. Read the returned excerpt, then explicitly copy it into the private case. Copying advances the case revision and makes earlier reviews historical; it does not fill funding fields. The fixture's $750,000 need is due November 1; its $100,000 retained distribution arrives November 10. All documents prominently identify the scenario as fictional.

The isolated app integration also passed against the live X1 account: browser search → readable cited preview → explicit copy → case revision 1 to 2. The copied excerpt persisted in the case projection, financial inputs remained unset, and the manager role was denied the private funding/evidence route. This does not yet establish Railway runtime configuration; follow [Stratten's setup steps](STRATTEN_X1_SETUP.md) for that last host-specific step.

## Individual connections — October 24 follow-up

Second Look's individual authentication is separate from X1 authorization. The backend supports password accounts, durable sessions, case membership and invitations. **The current main screen still mounts the presenter example; Ryan owns the individual sign-in and case-picker UI.** Mount `DecisionWorkbench` with `/api/cases/<selected-id>` after sign-in; its funding panel now supplies connect/disconnect controls. There is no completed customer onboarding claim yet.

For individual case owners, the adapter accepts their own **read-only** X1 key. It checks `get_user_capabilities` before saving; only exactly `mcp:read` and own-document passage search are accepted. The key is encrypted using AES-256-GCM with actor, case and connection version bound as authenticated data. It is never returned by status/case APIs or placed in evidence, sponsor requests, browser storage or agent tools. The form clears the input on submission.

Set `X1_CONNECTION_ENCRYPTION_KEY` once to a random 32-byte hex value in the server's private runtime configuration. Missing configuration disables individual linking without breaking the example. Keep this value separately from database backups; changing or losing it makes stored connections unreadable, requiring users to reconnect. Do not distribute the production encryption key to developers or reuse it across environments. Database backup retention also applies to encrypted connection rows; disconnect deletes the live credential, not historical backup snapshots. Revoke the key in X1 if it must stop working everywhere.

- `POST /api/cases/:id/x1/connection {key}`: current case owner only; validates the read-only key then saves it. Invalid keys do not overwrite a working connection.
- `POST /api/cases/:id/x1/disconnect {}`: deletes this owner's connection for this case and invalidates outstanding previews. Saved excerpts/history remain.
- `GET .../x1`: adds `canConnect` and mode `individual_case_read_only`; exposes no credential.
- Search rechecks ownership and the unchanged connection after the remote read. Disconnect/replacement during a search refuses its result. A disconnected or replaced connection cannot import an old preview.

The presentation environment key applies only to the presentation router. Individual cases never inherit it, even if an operator sets `X1_CASE_ID` to their ID. Each case requires its own explicit connection. Other case members cannot search the owner's X1.

### Clerk and OAuth direction

Keep the existing sign-in for today's presentation. A Clerk migration would change identity/session mapping and invitation ownership without completing X1 linking. For a customer launch, prefer managed authentication such as Clerk, preserve Second Look user IDs and memberships through an explicit identity mapping, and implement recovery/verification before claiming production readiness.

X1 supports OAuth, but its current `apps/mcp/lib/oauth-client-policy.ts` admits specific callback origins; `secondlook.ac` is not among them. The existing native/local callback rules are not a workaround for a hosted app. A future approved Second Look OAuth client needs exact callback admission, PKCE/state bound to the signed-in user/case, encrypted tokens, expiry/refresh, disconnect/revocation and cross-account tests. No X1 policy was relaxed in this change. This key-based connection is an interim integration, not OAuth or SSO.

### Verification of this slice

76 tests and the production build passed. An isolated signed-in synthetic account exercised the real `FundingPanel` and actual account case routes against X1: connect read-only key, search `capital`, preview/copy page 1, disconnect. The excerpt remained, funding facts stayed unset, and a post-disconnect search returned 503. This verifies the connection slice; the isolated test shell is not the missing customer onboarding UI. Tests also cover encrypted restart, ciphertext substitution refusal, cross-account/manager denial, broad-scope refusal, and disconnect during in-flight connection/search. No production customer credential was used.
