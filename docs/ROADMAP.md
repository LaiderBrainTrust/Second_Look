# Product roadmap — active build and next opportunities

Darren proposed the opportunities below. On October 24, Mat authorized expanding the working backend while Ryan builds the final UI. The first workflow tranche is now implemented and tested: competing offers, a term/consent checklist, and assigned questions. Audit export is also implemented. See [WORKFLOW_API.md](WORKFLOW_API.md) for the exact integration contract.

These are implementation claims, not customer validation. Ryan owns when and how the new controls enter the final product. Do not describe an API-only capability as a visible finished screen. The 2:45 PM feature freeze and 3:30 PM submission target still apply.

## Delivery status

| Slice | Status | Remaining acceptance |
| --- | --- | --- |
| Compare several buyers | Backend implemented; explicit fees, distribution basis, matching record dates, expiry and version history | Ryan's UI and presenter acceptance |
| Term checklist and consent/ROFR tracking | Backend implemented; assigned owner, deadline, evidence note, required/optional status | Ryan's UI; this records assertions, not legal consent or notices |
| Several assigned questions | Backend implemented; role-filtered access, answer, investor resolution, reopen, overdue state | Ryan's UI and multi-browser acceptance; roles remain simulated |
| Audit export | HTML/JSON implemented, including current workflow state and history in JSON | Final UI download control |
| User-created cases and separate participants | Backend implemented; individual accounts, scoped invitations and revocation | Ryan UI, multi-device acceptance, hosting cutover; display names are not verified identities |
| Other opportunities below | Not implemented or validated | Choose by user need and remaining time, not by model speed |

## Workflow

| Idea | What it does | Why it might matter (to validate) |
| --- | --- | --- |
| **Consent and right-of-first-refusal tracker** | Tracks the fund manager's consent to a transfer and any right of first refusal for existing investors, with each step's deadline and status. | Secondary transfers commonly need GP consent and can be subject to a right of first refusal. Interviews should test whether tracking these deadlines is a real pain point. |
| **Compare several buyers** | Puts multiple offers side by side, using the same server-side math in integer cents, so the LP sees which one actually pays more. | Extends today's "same price, different deal" calculation from one changing offer to several competing ones. |
| **Term checklist** | Flags common secondary-sale terms: who gets distributions, the record date, transfer fees, and conditions to close. | The distribution term is the one we demo today. A checklist would catch other terms that change the economics. |
| **Question tracker** | Several open questions to the fund manager, each with an owner, a due date and a status. | The original primary question remains; the new tracker supports several assigned questions with explicit investor resolution. |

## Evidence

| Idea | What it does | Why it might matter (to validate) |
| --- | --- | --- |
| **Holdings watchlist** | Alerts the LP when a holding's signals move after the last report, even before any offer arrives. | Moves the product from one-off deal review to something an LP opens regularly. Signals would still prompt questions, never valuations. |
| **Signals beyond gaming** | App store rankings, hiring activity and website traffic, so the same approach works for any venture fund, not just one holding game studios. | Steam is the demo's wedge. A general fund needs sources that fit its holdings. Each new source needs its own terms-of-use check and honest coverage labels. |
| **Read fund reports and tax forms** | Pulls fund value and distributions from quarterly reports and K-1s. | Squarely in Track 4 (Funds). Replaces the synthetic report with the LP's real records. Needs consent, document handling and a clear rule: extracted numbers are shown with their page and source, and a human confirms them before any calculation uses them. |

## Collaboration and trust

| Idea | What it does | Why it might matter (to validate) |
| --- | --- | --- |
| **Advisor dashboard** | One view of all of an advisor's clients and open cases. | Supports the $500 per team per month subscription hypothesis in the founder brief: advisors handle many cases, an individual seller handles one. |
| **More roles** | Adds the advisor, the buyer and legal counsel, each seeing only what they should. | Today's roles are simulated by one presenter. Real multi-party use needs real identities and server-enforced access per role. |
| **Audit export** | A clean history of who approved what and when, for an investment committee or compliance. | Builds on the saved approvals and event history the app already keeps. |
| **AI trace viewer** | Shows the PRISM trace behind any AI-drafted text, so a reviewer can see exactly what the model was given and what it returned. | Today the trace ID is recorded. A viewer would let a non-engineer check it. |

## How to use the remaining opportunities

- **Founder brief and Devpost:** distinguish implemented backend, accepted UI and unbuilt plans. Do not imply the entire roadmap shipped.
- **Interviews at the event:** ask which of these would change a reviewer's next case. Record actual answers, with permission.
- **Next implementation:** rank by what interviews and the working product support. Preserve time for the complete walkthrough and submission.
