# Research, questions and competing offers

Second Look connects a saved observation to a question for the fund, then uses the fund answer and checked sale terms to compare cash outcomes. The comparison is for offers on the same fund interest, not a ranking of different investments.

## What changed

| Before | After | Why |
| --- | --- | --- |
| Competing offers start behind a collapsed section and require mental subtraction | Comparison is open on Your offer, with two selected cash outcomes, their difference and a conditional payout threshold | Explain what changes the decision |
| A saved draft is separated from its evidence | The exact saved question, explanation and dated selected source appear together | Show what to ask and why |
| Changing the selected game can leave an unrelated draft visible | Current results match the game, source snapshot and case version; older results are labeled | Prevent stale evidence from looking current |
| Sponsor evidence is scattered | Optional proof view explains all four roles from that run's receipts | Make provenance inspectable without distracting from the decision |

There is a **Jump to the proposed question** button on Research. The proof view is below the actual draft and its explicit **Use this question** action. Opening saved results does not start a new model call.

The comparison uses deterministic server calculations. Zero fees and adjustments must be explicit. Missing terms, expired offers, inconsistent record dates and unconfirmed answer bases cannot acquire a confirmed cash difference. Withdrawn offers are not selectable. When there are more than two offers, the selected pair is named and the existing strongest-offer calculation still considers the full set. The pair view conservatively withholds confirmed outcomes while the overall comparison has unresolved active offers.

A new fund answer invalidates the earlier basis checks. Neither viewing a difference nor saving comparison offers accepts a sale or replaces the primary offer. Private offers and thresholds remain investor-only.

## Isolated comparison rehearsal

The submitted three-minute script and shared hosted case are unchanged. To try the additional comparison locally:

```sh
npm ci
npm run demo:comparison
```

This uses the existing API/Vite development ports, so stop your own earlier development instance first. It creates a fresh private rehearsal database on every start. It does not seed the hosted service or reset existing accounts. The saved research capture is labeled by its original date; it is not a new provider run.

1. Open the Vite URL printed in the terminal and choose **Your offer**. The comparison is already open.
2. Two explicitly fictional offers are entered: A pays $700,000 and lets the investor keep the fund payout; B pays $760,000 and gives that payout to the buyer. Fees and adjustments are explicitly zero, with the same rights date.
3. See the conditional $60,000 payout turning point. No payout or winner is yet confirmed.
4. Open **Research (optional)** and **Jump to the proposed question**. Read the saved question beside its evidence. Expand **How the four sponsors contributed to this saved result** when you want the receipts.
5. Choose **Use this question**, then **Try answering as the fund contact**. Use the labeled fictional $100,000 response and save it.
6. Choose **See the investor’s updated total**, then **Your offer**. Check the displayed fund answer against each fictional offer and click each **I checked: this answer applies to…** button.
7. The pair now shows $800,000 versus $760,000 and an explicit $40,000 difference before tax. The $60,000 turning point remains a condition, not a forecast.
8. Change the fund answer and return to the comparison. Confirmed totals disappear until the new answer is checked against the offers.

The ordinary shared demonstration remains $700,000 plus a retained $100,000 payout, followed by changed terms that remove that payout. The extra comparison is a separate rehearsal, not a changed submission claim.

## Evidence boundaries

Steam provides bounded sampled review sentiment and a point-in-time player count. Neither sets a fund valuation, payout or legal entitlement. A small or missing sample is shown explicitly. Empty saved news does not prove that no news exists or that an Akta call succeeded.

Sponsor proof uses the saved run's company profile/news, task/input/output versions, actual draft method/model, and trace receipt. Rule-based drafts are identified as such. Failed or missing PRISM traces remain failed or missing. This proof view makes no Marketplace or separate sponsor-challenge eligibility claim.

## Verification

104 automated tests across 26 files pass, including pair thresholds, ties, one-cent boundaries, excluded inputs, changed answer bases, research selection and incomplete sponsor evidence. TypeScript and the production build pass.

Browser acceptance used an isolated HTTPS database: saved Tiny Glade question and its source, all four persisted sponsor roles, explicit sharing, fictional fund response, per-offer checks, the $40,000 difference, a third offer/pair selector, changed-answer invalidation, and 390px layouts. The local capture uses the repository's validated original research fixture. No shared presentation data was modified.

No new provider calls, real investor decision, cross-fund investment scoring or general plugin marketplace were tested or claimed by this change.
