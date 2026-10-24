# Customer readiness audit — October 24, 2026, 2:50pm EDT

**Assessment: working engineering prototype with substantial backend behavior; not a finished customer application.** A guided, explicitly synthetic demonstration is reasonable only after its complete click path is rehearsed. Do not equate merged endpoints, passing tests, provider credentials, or a successful isolated OAuth test with a completed customer journey.

Inspected source/deployment: `30adb3937c02f372cd69aa611d2d412f89985c33`. Mat/Codex owns backend fixes; Ryan retains final UI ownership. This audit does not take over his files.

## Findings and concrete acceptance

| Priority | Finding and observed consequence | Required completion |
| --- | --- | --- |
| Today | Team sessions live only in server memory, so each redeploy logs presenters out despite an eight-hour cookie. | Persistent hashed session records, retained role, restart test, expiry/logout/code-rotation tests. Fix merged in [PR 21](https://github.com/LaiderBrainTrust/Second_Look/pull/21), with 87 tests and production build passing; existing sessions need one new login after that release. |
| Today | Main UI only signs in with a team code and fetches `/api/case`. A real individual login followed by page reload was reproduced returning **“Choose a local demo role” / “Case unavailable.”** The X1 return URL cannot complete the individual case journey through this UI. | Read session mode; support individual sign-in, case list and `/#case=<id>`; bind every panel to `/api/cases/<id>` for accounts. Never offer the presenter role switcher to an individual account. Test invitation acceptance in a second browser. |
| Today | The visible manager form always submits `distributionCents: 10000000`, regardless of its text. Buyer controls and explanatory copy assume the $700,000 fixture; display copy assumes zero adjustment. | Make the real amount and current terms editable/derived. Keep any “insert example” action explicitly synthetic. Verify a second amount and a nonzero adjustment, not only the prepared example. |
| Today | Comparison quotes and the deal being approved are separate objects. Editing a private comparison does not select it as the current buyer offer. The approval button applies to `state.offer`; the comparison can show a different highest-cash quote. | Clearly identify the exact buyer, amount, terms and version at approval. Implement an explicit, permission-aware path from candidate quote to the offered deal, or label comparison as separate and never imply that comparison selection is approval. |
| Today | “Print decision record / save PDF” calls `window.print()` on the application instead of opening the purpose-built decision-record endpoint. The app includes forms and conditional sections. | Link to the authorized decision-record export for the selected case/revision and inspect the printed output. |
| Today | Provider badges show this process's last result, not all endpoint capabilities or the complete distributed workflow. A successful enrichment hid a prior news failure; Nicrron/PRISM stayed `not_verified` after a remote reviewer completed and saved a valid trace. | Show per-operation failures and completed run receipts with timestamps. Distinguish local calls from receipt-backed remote completion. Do not treat a badge as acceptance of the whole workflow. |
| Before customers | Gaming research uses three explicitly fictional holdings with fixed game/company mappings. Source notes are entered references, not parsed uploaded fund documents. X1 imports selected excerpts but does not establish contractual fund ownership or auto-populate economics. | Present these limits accurately. A customer needs its own portfolio mapping, source review and editable confirmed terms; do not sell a general fund valuation/diligence engine. |
| Before customers | Durable questions/history are useful, but the current workflow does not notify the real manager or chase deadlines; participants must return to the app. Account recovery/MFA policy, provider tenant separation, deletion/retention and an actual Railway restore drill remain open. | Complete invitation/notification and recovery paths, establish data handling and tenant boundaries, and demonstrate restoring a separate database before confidential customer use. |

## Fresh sponsor evidence

The production service now has all eight sponsor settings. A fresh **synthetic individual case** completed on `secondlook.ac` at **2:49pm EDT**:

- Akta company search and recent news returned ten dated findings.
- Roundtable task `70c6712375e74f68bc331a7cdf343fe8` completed with a pinned result and source versions.
- Result method was `nicrron`.
- PRISM trace receipt: `b9de5a7e-c578-40b6-8974-fa462a7965af`, status `recorded`.
- The result was collected by the Railway app. This does not prove the reviewer ran in the Railway process; the team has a shared reviewer identity.

An earlier probe requested January 2026 news and received a 403. Direct provider diagnosis identified the plan's **187-day history limit**, not a universally broken news endpoint. Repeating with an October 1 cutoff succeeded. The app currently hides that useful plan-specific explanation behind a generic provider-access error. No synthetic financial data was presented as real holdings, no manager answer was shared, and the presentation case was not modified by this probe.

## What is real and worth keeping

The backend has integer-cent calculations, unknown-value handling, stale-revision rejection, participant permissions, saved decisions/history, version-pinned research and recovery, and individually encrypted X1 connections. Real hosted X1 consent, passage search, selected import and provider-revoked disconnect were exercised. Those are meaningful implementation results, not proof that the whole application is ready for customers.

## Finish order

1. Ship the restart-safe presenter session fix.
2. Ryan connects one complete account/case/role journey and removes fixture-only controls from that journey.
3. Make the exact deal being approved explicit; connect the proper export.
4. Use saved run receipts for sponsor proof; rehearse one uninterrupted start-to-finish scenario on Ryan's presenting device.
5. Address customer operations and data handling before accepting confidential client records.

Stop adding feature surface until this journey works. The next acceptance is a person using the application without console commands or an engineer explaining which backend endpoint exists.
