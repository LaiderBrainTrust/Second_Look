# Connect X1: separate identity, optional financial context

Second Look owns its accounts, case memberships, invitations and decision history.
X1 is the optional source of an investor's financial records. A buyer or fund
manager does not need an X1 account to participate in Second Look.

An X1 browser connection never signs someone into Second Look, merges accounts,
or grants another participant access to X1. The investor signs in to Second Look,
opens a case they own, selects **Connect X1**, signs in/consents at X1, and returns
to finish connecting that case. They can then search and explicitly copy selected
source excerpts. Connection itself imports nothing and changes no financial fields.

## Runtime activation — Stratten

The OAuth client is registered in production X1 with consent enabled:

```env
X1_OAUTH_CLIENT_ID=vhSXZsGRsOyleSfP
```

This is a **public client identifier**, safe to publish. It identifies Second Look,
not an investor. Authorization uses S256 PKCE; no OAuth client secret is required.
For initial Railway setup, generate a private encryption key on your own machine:

```sh
openssl rand -hex 32
```

Save the resulting 64-character value as `X1_CONNECTION_ENCRYPTION_KEY` on the
Railway API service, alongside the public client ID above, then redeploy. You do
not need the build host's key: Railway has a separate database and can use its own.
Never commit the generated value or put it in the browser. If Railway already has
a valid key and saved individual connections, **keep that existing key** instead.

Keep `X1_CONNECTION_ENCRYPTION_KEY` stable on the Railway service with its persistent
SQLite volume. Do not replace it during
deploys: existing connections depend on it. The runtime origin must be exactly
`https://secondlook.ac`. The old `X1_API_KEY` is only for the explicitly synthetic
presentation case and is not used for individually connected accounts.

1. Deploy the merged Second Look release and set the client ID above in Railway.
2. Confirm X1's release includes the exact callback admission/read-only policy.
3. In an **individual** account, open an owned case and use the funding panel's
   Connect X1 button. The team presenter login is deliberately ineligible.
4. Complete X1 consent and click **Connect to my case** on return. Search, copy
   one synthetic excerpt, then disconnect. Verify no further search is possible.
5. Repeat on `secondlook.ac` before claiming the production connection works.

Ryan owns the account/case selection screens. The reusable FundingPanel accepts
`caseBase="/api/cases/<id>"`. The connection return link is `/#case=<id>`; the
customer app needs to restore that case. The presentation's `/api/case` is not an
individual account and does not show OAuth controls. Do not call that presentation
a complete customer signup flow.

## HTTP contract

- `GET /api/cases/:id/x1` adds `canConnectOAuth`. It is true only on the configured
  production origin with encryption and an OAuth client ID.
- `POST /api/cases/:id/x1/authorize {}` returns `authorizationUrl` and sets a short
  lived HttpOnly, Secure, SameSite=Lax browser-binding cookie. Navigate to that URL
  in the same tab. Do not retain or log the authorization URL.
- `GET /api/connections/x1/callback`: exact registered callback; validates state,
  issuer and browser cookie, stores the encrypted authorization response, redirects
  to a clean same-origin page. It neither exchanges tokens nor establishes login.
- `POST /api/connections/x1/complete {}`: requires the original individual account
  **and original session**, live case ownership, exact-origin JSON POST and unchanged
  connection generation. Consumes pending state once, exchanges code with PKCE,
  verifies X1's actual read-only capabilities, and seals the tokens to that case/user.
- Existing search/import/disconnect endpoints are unchanged. Disconnect immediately
  disables this app's access and attempts provider revocation, reporting uncertainty
  if X1 cannot confirm it. Copied excerpts and history remain.

Both existing API keys and OAuth tokens remain encrypted at rest. Refresh is shared
for concurrent requests in this single-process SQLite deployment. A replaced or
disconnected connection cannot be restored by an in-flight exchange or refresh.
Pending encrypted flows expire after ten minutes; a restart preserves pending state
and account sessions. Failed/uncertain code exchange requires starting a new consent
flow rather than replaying a single-use code. All provider requests have a timeout,
fixed issuer and redirect refusal. Token responses and errors are not logged.

The Strict Second Look session cookie is unchanged. The separate Lax cookie permits
only the OAuth return; the explicit same-origin completion checks the Strict session.
Do not convert callback parameters into application identity or bypass that check.

## Verification boundaries

Automated route tests exercise PKCE, browser/account/session binding, replay, expiry,
issuer substitution, encrypted storage, refresh and disconnect races with a fake
provider. X1's policy suite separately verifies callback admission and read-only
scope capping. These do not replace an actual production consent round trip.


## Live acceptance — October 24, 2026

Verified on `secondlook.ac` at application release
`35fe0c31acf6972b25a3bef1b0bd440b1904194b`, with X1 production release
`b31e096f67da051859350b5d34099af7dd8de776` ([X1 PR4032](https://github.com/x1wealth/x1wealth/pull/4032)):

- Railway reported encryption and browser OAuth configured, without exposing its key.
- An individual synthetic Second Look account started consent for its own case.
- The dedicated synthetic X1 account approved access and returned through the exact callback.
- Same-session completion verified actual read-only X1 capabilities and saved the connection.
- Search returned the fictional `capital-call.pdf`; selected import copied one cited excerpt,
  advanced the case revision from 1 to 2, and did not populate financial fields.
- Disconnect received provider confirmation of revocation; a subsequent search returned 503
  and connection status was false. The copied excerpt remained in case history.

This used the real account/case APIs and hosted consent/return page in a browser.
Ryan's customer account/case-navigation screens and a timed presenter rehearsal remain
separate acceptance work. The source records were explicitly fictional; this is no
claim of a real investor outcome, trade, or complete production onboarding.

Second Look app changes: [PR17](https://github.com/LaiderBrainTrust/Second_Look/pull/17)
and [PR18](https://github.com/LaiderBrainTrust/Second_Look/pull/18). Validation: 82 app
tests passed, with the 10 connection tests rerun after the final atomic-storage guard;
TypeScript and production build passed. X1 release gates passed both typechecks,
5,215 MCP tests and the 14 connection-page contract tests.
