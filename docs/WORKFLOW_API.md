# Darren's workflow tranche — integration contract

Owner: Mat/Codex backend; Ryan final UI. Authorized by Mat on October 24 while the final UI is being built. This adds the four workflow ideas from Darren's roadmap without changing existing endpoint shapes or adding another provider. It is backend functionality until Ryan exposes the controls. No UI files were changed.

## What a user can do

- Compare several written offers on the same distribution and record-date basis, including an explicit price adjustment and seller fees. The higher purchase price may leave less cash with the seller.
- Assign multiple questions to the investor, manager or buyer. Only the assigned participant answers. The investor reviews the answer, resolves it, or reopens it. Nothing is emailed or messaged externally.
- Record consent, right-of-first-refusal, record-date, transfer-fee or other conditions, each with an owner, deadline and supporting evidence note. A deadline passing does not imply consent or a waived right.
- Download the combined current decision and workflow. JSON retains all item versions plus exact workflow snapshots at approval. The HTML includes current offers, questions and conditions, as well as the existing approval history.

## Simple integration

Use the current session and relative URLs. Never copy API keys to the browser.

```ts
import type { DiligenceView, DiligenceCommand } from '../shared/diligence';

const state: DiligenceView = await fetch('/api/case/diligence').then(r => r.json());

async function change(command: DiligenceCommand) {
  const response = await fetch('/api/case/diligence/commands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: state.revision, command }),
  });
  if (response.status === 409) {
    // Refresh BOTH case and diligence. Show the change; never auto-resubmit.
    throw new Error('This case changed. Refresh and review it before retrying.');
  }
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json() as Promise<DiligenceView>;
}
```

Keep the latest returned `revision` in actual UI state; the snippet's initial constant is illustrative. Refresh `/api/case` after a successful workflow mutation because all changes increment the same case revision. Disable duplicate submissions while pending. A retry using the old revision returns 409 and cannot create another entry.

Local development additionally uses the existing `x-demo-role` header. Hosted mode ignores it and derives the role from the session. Switching presenter roles does not create real counterparty accounts.

`GET /api/case/diligence` returns:

- `caseId`, `revision`, `asOf`.
- `questions`: all for investor; only questions assigned to the current role for manager/buyer. Each includes server-derived `overdue`.
- `privateDiligence`: **investor only**. `comparison`, `conditions` with `overdue`, `blockers`, immutable `history`.

Do not join private cached investor state into another role's view. Clear role-dependent query caches on role changes. An empty counterparty question list means no questions assigned to that role, not no work in the whole case.

## Offers: same headline is not the same proceeds

POST command:

```json
{
  "kind": "save_offer",
  "offer": {
    "id": "buyer-a",
    "buyer": "Buyer A — fictional",
    "purchasePriceCents": 70000000,
    "priceAdjustmentCents": 0,
    "sellerFeesCents": 500000,
    "distributionRecipient": "seller",
    "distributionBasisSourceId": "COPY_CURRENT_CASE_ANSWER_SOURCE_ID",
    "recordDate": "2026-10-01",
    "expiresAt": null,
    "sourceNote": "Fictional written offer, distribution and fee clauses",
    "conditions": "Subject to written manager consent",
    "withdrawn": false
  }
}
```

`id` is a stable caller-generated ID: 1–64 letters, digits, hyphens or underscores. A repeated ID revises that offer, increments its version and retains the previous snapshot. Set `withdrawn: true` to exclude an offer without deleting its history; saving `false` can restore it.

**Explicit distribution confirmation:** copy `case.answer.source.id` only after the user confirms that this quote uses that answer's distribution. Use null until confirmed. A changed manager answer makes all older bases unresolved. General tracked-question text never supplies a financial amount.

Amounts are USD integer cents. Purchase price and seller fees are nonnegative and capped at 1 trillion cents each. Price adjustment may be signed within the same absolute bound. `priceAdjustmentCents`, `sellerFeesCents` and `distributionRecipient` may be null; null is not zero. `recordDate` is an actual YYYY-MM-DD date or null. Deadlines are UTC ISO timestamps, e.g. `2026-10-24T19:00:00Z`, or null for no recorded deadline. Do not silently turn an unentered fee into zero.

The server computes `netBeforeTaxCents`:

`purchase payment + price adjustment + retained distribution − seller fees`

It excludes tax, timing, financing, collectability and unpriced conditions. This is explicitly different from the existing primary offer's **gross receipts**, which exclude fees. Label the two differently.

A row's amount is unresolved if its monetary terms, distribution confirmation or record date are missing. Even with complete amounts, `highestNetOfferIds` is empty unless at least two active offers share the same record date and none is incomplete or expired. Ties return multiple IDs. Withdrawn rows remain visible but are excluded. `highestHeadlineOfferIds` identifies only the largest active purchase price, not a recommended winner. Never calculate rankings in the browser or present the largest headline as the best deal.

**Fictional example:** manager confirms $100,000. A offers $700,000, seller retains the distribution, seller fees $5,000 → $795,000 before tax. B offers $750,000, buyer receives the distribution, seller fees $25,000 → $725,000. B's headline is $50,000 higher but A leaves $70,000 more on these explicit assumptions. Both record dates must match and bases be confirmed. No automatic selection, replacement of the main offer, signing or acceptance occurs.

## Questions: assignment, response, investor resolution

```json
{"kind":"add_question","question":{"id":"distribution-rights","question":"Which agreement clause confirms distribution entitlement?","owner":"gp","dueAt":"2026-10-24T19:00:00Z"}}
```

Adding a question explicitly makes it visible to its assigned role (`lp`, `gp`, or `buyer`) in this case. Explain that consequence before submission. This does not send an email, notification, Roundtable task or external request.

```json
{"kind":"answer_question","id":"distribution-rights","text":"See the fictional agreement, clause 3."}
```

Only its owner can answer. An answer sets status `answered`; it does not resolve the investor's work or modify the main monetary distribution. Only the investor can then resolve:

```json
{"kind":"resolve_question","id":"distribution-rights","note":"Reviewed clause 3 against the current terms."}
```

An answer is required first. Only the investor can reopen:

```json
{"kind":"reopen_question","id":"distribution-rights","note":"Reconfirm after the offer changed."}
```

Reopening clears the current answer and keeps it in immutable history. A resolved question must be reopened before another answer can be submitted. Questions cannot be silently deleted. Limits: 50 questions per case; 2,000-character question/notes; 5,000-character answer.

## Closing checklist and consent/ROFR tracker

```json
{
  "kind":"save_condition",
  "condition":{
    "id":"manager-consent",
    "kind":"gp_consent",
    "title":"Written fund-manager consent to transfer",
    "owner":"Fund manager",
    "dueAt":"2026-10-24T19:00:00Z",
    "required":true,
    "status":"pending",
    "evidenceNote":null
  }
}
```

Investor only. Supported kinds: `gp_consent`, `right_of_first_refusal`, `record_date`, `transfer_fee`, `other`. `owner` is a displayed responsibility, not an authenticated account or automatic assignment. Status is `pending`, `satisfied`, or `not_applicable`. Both completion statuses require a nonempty `evidenceNote`. If a condition actually does not apply, record the reason; don't treat missing evidence as an automatic exemption. Reuse the ID to update or return it to pending; prior assertions stay in history. Maximum 50 conditions and 20 comparison offers per case.

A required pending condition blocks app approval; optional conditions remain visible without blocking. No condition is generated as a legal requirement for every fund, no clocks imply a right expired, and saving consent is not obtaining it. This is a tracker for the user's confirmed facts and obligations.

## Approval, history and compatibility

- Every workflow mutation advances `CaseState.revision` in an atomic SQLite transaction. Stale requests return 409. Existing research prepared on an earlier case revision stays historical.
- Existing main workflow remains unchanged when no diligence items have been created. Nothing is prepopulated in the live presentation database.
- When questions or conditions exist, approval returns 422 until all tracked questions are resolved and all required conditions are no longer pending. Read `privateReview.diligenceBlockers` or `privateDiligence.blockers` to explain the next step.
- An approval snapshots the full current diligence state. Any subsequent workflow edit makes that approval historical. Alternative-offer edits do not replace or accept the main deal.
- Counterparties never receive competing bids, private condition notes, item history or approval snapshots.
- GETs never mutate status; `overdue` and expiry are computed from the clock. Refresh while viewing deadlines; no background notification delivery is implemented.
- The history cap is 1,000 workflow changes per case. The API refuses additional writes rather than silently pruning evidence. Multi-case creation is not implemented.
- Current export: `/api/case/decision-record?revision=N&format=html` or `format=json`. Keep download investor-only and handle stale revision 409.

## Acceptance and remaining work

47 tests and TypeScript/Vite build cover the pre-existing flow plus dollar correctness, incomplete/expired/mismatched-date comparisons, changed answer basis, role isolation, resolution/reopen, recorded evidence, historical approvals, invalid inputs, restart persistence, rollback, export escaping and hosted HTTP permissions.

Ryan still owns UI composition, role-state clearing, accessible controls and presenter acceptance. This tranche adds no sponsor API calls; the existing gaming → Roundtable/Nicrron → PRISM flow stays intact. Neither backend tests nor deployment prove final UI or a successful spoken demo.
