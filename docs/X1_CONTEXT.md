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
