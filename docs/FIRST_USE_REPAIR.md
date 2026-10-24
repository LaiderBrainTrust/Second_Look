# First-use repair — October 24

The product must explain the investor's task before exposing its tools. Earlier functional checks did not establish that a first-time user could understand the workflow.

## Current journey

1. **Your offer:** enter the offer and its source. Unknown adjustments and payout ownership can remain unknown. See what still needs an answer.
2. **Research (optional):** investigate a company named in the fund report or find an existing X1 document. Research does not determine ownership or automatically populate financial terms.
3. **Confirm details:** ask the fund contact (for example, investor relations) for the payout amount and dated source. The buyer/sale agreement separately establishes adjustments and who keeps the payout.
4. **Review & save:** inspect the terms and unresolved items, save a dated review, then download a summary. This does not accept a sale or transfer money.

Optional offer comparison and cash-deadline checks explain their inputs and next action. Copying the current offer retains unknown fees and dates. Form revisions are pinned to prevent a stale draft from overwriting another person's changes.

## Verified in the isolated hosted browser

- An existing investor account opens its review at desktop and 390px mobile widths without horizontal overflow.
- A newly created review accepts unknown payout ownership and adjustment; no invented total is shown, and final review is blocked.
- A completed review saves, survives refresh and downloads as HTML.
- The example's suggested X1 capital-call search retrieves `capital-call.pdf` from the dedicated synthetic X1 connection. Saving the excerpt retains it in the review and explains that amounts are not filled automatically.
- A $750,000 cash deadline can be saved from the form using dollar/comma input. With no offers, the next action opens offer comparison.
- Copying the current offer saves an actual comparison row and explicitly retains unknown fees; no spurious net total appears.
- Source review identified and repaired stale comparison edits, expired X1 search previews, failed-connection retry and unavailable funding-form initialization.

Automated validation: 96 tests across 25 files passed; TypeScript and Vite production build passed. These are engineering checks, not observed customer comprehension or a completed production-readiness audit. Exact release and browser receipts are retained by the implementing lane.

## Remaining production boundaries

This is a controlled pilot/hackathon application with synthetic presentation data and individual case permissions. Public customer rollout still needs an established account recovery/support process, deployment backup-and-restore acceptance, and an observed first-use session with someone who has not helped build it. Sponsor integrations are live-call dependent; prior successful calls do not guarantee future provider availability. Ryan's forthcoming marketing design remains a separate integration; this change preserves existing styles.
