# Real cases and participant accounts — Ryan's integration guide

This is the next backend path after the gaming example. It accepts user-entered cases and isolates them by account membership. The existing `/api/case` example API remains compatible. No UI files were changed: account/create-case/invitation screens must be implemented by Ryan before claiming an end-user release.

Use the primary Node host or the Railway container for these account routes. The optional `api/main.py` Ninoo bridge supports the older presenter flow only; it does not yet forward account sessions or the new case routes.

## The smallest complete user journey

1. Sign in to an individual account, or register using the early-access enrollment code supplied by the team. Alternatively, accept an invitation and create an account in that flow.
2. List your cases, or start one with actual entered terms and source references. The example is a separate “Explore an example” choice, not a default holding in a new case.
3. Invite a manager or buyer. The UI must say that the link grants access to this case and role. The investor manually shares it with the intended person.
4. The recipient accepts the one-time invitation, using their existing signed-in account or creating an account. They can answer only within the granted role; there is no role switcher for account sessions.
5. Work through the existing offer/question/review APIs under the selected case path. Changes persist; each person's actions record their account ID and display name. User-provided display names are not independently verified legal identities.
6. Download the investor's record. Show the latest revision and any outstanding questions or changed terms first.

## Session modes

`GET /api/session` returns `{hosted, authenticated, mode?, user?, role?}`.

- `mode: "account"`: `user: {id, handle, displayName}`. Roles belong to case memberships, not to the session. Render the case picker and case-specific role.
- `mode: "presenter"`: existing example mode, with `role`. Only this mode can use `POST /api/session/role` and the old `/api/case` endpoints.
- Account sessions cannot use the presenter role switcher. The presenter code does not grant access to private account cases.

Session cookies are HttpOnly, Secure, SameSite=Strict and expire after eight hours. Account sessions are stored as hashed tokens in SQLite and survive process restarts. Do not store passwords, invitation tokens or cookies in localStorage. `POST /api/session/logout {}` revokes the current session. The original presenter sessions remain in-memory and are invalidated by restart.

### Register and sign in

`POST /api/accounts`:

```json
{"handle":"your-chosen-handle","displayName":"Your name","password":"YOUR_UNIQUE_PASSPHRASE","registrationCode":"TEAM_PROVIDED_ENROLLMENT_CODE"}
```

Use a distinct password, not the team enrollment code. Handle: 3–60 lowercase letters/digits/dots/hyphens/underscores, starting with a letter or digit. Password: 12–256 characters. Registration is restricted to the early-access team code; invite recipients do not need that code. Registration returns 201 and signs in the new account. Both names and credentials in the examples are placeholders, not working accounts.

`POST /api/session/login {handle,password}` signs in an account. The existing `{code}` login still opens presenter mode. Keep these choices visibly separate; don't use a single ambiguous sign-in field.

`POST /api/session/password {currentPassword,newPassword}` changes the password, revokes all existing account sessions, and issues a fresh session cookie for this browser. There is no self-service forgotten-password or email-verification flow yet. Do not claim one or implement a fake reset button.

Registration/invitation acceptance and sign-in have bounded server-side attempt limits. Error responses are JSON. All hosted POSTs require JSON and the exact configured browser Origin.

## Cases

`GET /api/cases` returns `{cases:[{id,title,revision,role}]}` for this account only.

`POST /api/cases`:

```json
{
  "requestId":"CLIENT_GENERATED_UUID",
  "title":"Fund interest review",
  "ownerEntity":"Owner or entity supplied by the user",
  "reportNote":"Report reference and page, or null if none",
  "offerNote":"Written offer reference and clause",
  "purchasePriceCents":70000000,
  "priceAdjustmentCents":null,
  "distributionRecipient":"seller",
  "question":"What distribution is attributable to this interest?",
  "allowExternalResearch":false
}
```

Use `crypto.randomUUID()` once per creation attempt; reuse it for a network retry. The same request ID and normalized fields return the same case; a changed payload using that ID gets 409. Do not generate a new ID on every retry.

New cases have `mode: "user"`, `answer: null`, no invented holdings, and no injected gaming research. The report/offer are references entered by the user, not files we parsed. The initial price is required; other unresolved financial terms remain null. An answer must come from an invited manager account before the current response can be approved.

`allowExternalResearch` must be explicitly true or false. Explain before enabling: selected public evidence, an opaque case ID, offer price/version/recipient and the research question context are processed by Akta, the team's Roundtable workspace, Nicrron and PRISM. Those provider workspaces may be accessible to their team administrators. Source-document text, report notes and participant identities are not intentionally included in the outbound review payload. Do not send confidential documents through the shared hackathon provider workspace.

The owner can change that permission via `POST /api/cases/:id/external-research {expectedRevision,enabled}`. This increments revision and invalidates earlier approval. Disabling stops new requests from this path; it does not delete prior provider data or recall an already-dispatched task. Existing background results may finish reconciliation.

## API path mapping

Keep a single API-prefix helper; do not copy the domain logic into components:

```ts
const base = selectedCaseId ? `/api/cases/${encodeURIComponent(selectedCaseId)}` : '/api/case';
```

Account users must choose a case before calling case APIs. Never fall back to `/api/case` for a missing selection in account mode.

| Existing operation | Account case endpoint |
| --- | --- |
| Read current case | `GET /api/cases/:id` |
| Answer, revise or approve | `POST /api/cases/:id/commands` |
| Compare offers / tracked questions / conditions | `GET /api/cases/:id/diligence`, `POST .../diligence/commands` |
| Decision export | `GET /api/cases/:id/decision-record?format=html&revision=N` or `format=json` |
| Saved external research | `GET/POST /api/cases/:id/research`, existing `/:runId/review`, `/check`, `/share` suffixes |
| Akta company lookup | `POST /api/cases/:id/research/lookup/search {query}`; same discover/enrichment/news operations |

The prepared Steam catalog belongs to the example only. New cases do not claim to own those studios. The general Akta/research path works with an explicitly selected company and a report cutoff; that company selection is not proof of fund ownership. Do not wire a new user case to the example `/gaming` endpoint.

All commands use `{expectedRevision,command}` as before. 409 means refresh and review, never auto-approve. An owner can change the main question with:

```json
{"expectedRevision":1,"command":{"kind":"set_question","text":"Updated manager question","sourceNote":"Report p. 4"}}
```

That clears the previous answer and game context, keeping prior approvals historical. The manager's existing `answer` command supplies `{text,distributionCents}`. The buyer can change the full offer:

```json
{"expectedRevision":2,"command":{"kind":"revise_offer","purchasePriceCents":75000000,"priceAdjustmentCents":0,"distributionRecipient":"buyer","sourceNote":"Revised written offer, clause 2"}}
```

The owner enters the original offer; only an invited buyer can revise it using this command. Dollar calculations still exclude unmodeled terms. The account ID/display name comes from the authenticated session, never the command body.

## Invitations and revocation

Owner only: `POST /api/cases/:id/invitations {role:"gp"|"buyer",recipientHandle?:string}`. Returns `{id,token,acceptanceUrl,expiresAt,role,recipientHandle}`. Invitations expire after 24 hours, grant only that case/role, and can be accepted once. They cannot grant another investor/owner. An existing member's role cannot be overwritten by accepting an invitation.

A specified `recipientHandle` restricts acceptance to that account handle. Without it, **whoever first uses the link receives the grant**. Tell the owner to share it privately. This is a capability invitation, not email-verified identity. Do not log or send the token to analytics or sponsors.

The acceptance URL uses `/#invite=TOKEN` so the token is not sent in a URL query. Implement that route before presenting it as working:

1. Capture the fragment in memory and immediately remove it using `history.replaceState`.
2. Show sign-in or create-account fields. Never accept an invitation automatically on a GET or page view.
3. On explicit acceptance call `POST /api/invitations/accept {token}` if already signed in, or `{token,handle,displayName,password}` to create an account and accept together.
4. Set the selected case to the returned `caseId`; refresh session and case membership.

An unauthenticated recipient with an existing handle signs in first, retaining the token only in memory. Wrong-recipient, revoked or expired invitations cannot create an orphan account or grant access. A request that fails after acceptance can recover by signing in and listing cases.

Owner only: `GET /api/cases/:id/members` returns members, invitation metadata (never raw tokens) and recent access events.

- `POST /api/cases/:id/invitations/:inviteId/revoke {}` prevents unused invitation acceptance. For an already accepted invitation, remove the member instead.
- `POST /api/cases/:id/members/:userId/revoke {}` immediately blocks that account on subsequent requests to this case, even if its cookie is still valid. Its other cases remain accessible. Owners cannot revoke themselves.

Show the exact case/person/role before revocation. Revoking membership does not erase their historical contributions. A fresh invitation can restore access intentionally.

## What is and is not production-ready

Implemented: persistent account authentication, scrypt password hashes, hashed invitation/session secrets, exact-origin POST checks, immutable per-request case scopes, server-side role checks, invitation expiry/use/revocation, persisted actor attribution, optimistic concurrency, case-creation idempotency and SQLite persistence.

Still required: Ryan's account/onboarding/invitation UI; final multi-device browser acceptance; Railway/domain cutover and restore exercise; operational monitoring, account recovery/MFA/verified identity policy, data retention/deletion policy, per-tenant provider credentials/workspaces before confidential customer processing, independent security review and broader load testing. The working backend is not a claim of full production readiness.
