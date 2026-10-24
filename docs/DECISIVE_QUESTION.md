# Which answer changes the offer comparison?

Implemented backend and integrated investor UI. Ryan still owns the main screen and styling. This feature is a decision-support calculation, not a valuation or execution engine.

## User experience

Lead with the decision: **Which offer leaves me with more, and what must I find out first?**

Synthetic illustration: offer A pays $700,000 and the seller keeps distribution D; offer B pays $760,000 and the buyer keeps D. With equal record dates, zero fees/adjustments and other risks excluded, A and B tie at D=$60,000. Below that B pays more; above it A pays more. At D=$100,000, A pays $800,000 and B $760,000. These are conditional cash calculations, not realized savings or fair values.

The engine groups offers by whether the seller retains the distribution and chooses the largest fixed cash component in each group. This calculates the winning frontier rather than a misleading crossing between two offers dominated by a third. It preserves ties and integer cents. Negative or unsupported-range thresholds do not create a misleading decisive question. Unknown fees/adjustments/rights and mismatched record dates prevent a complete comparison. Expired and withdrawn offers never silently win.

## API

`GET /api/cases/:id/decision` returns `DecisionAnalysis` from `shared/decision.ts`, investor-only. Example presenter route: `/api/case/decision`.

- `status`: incomplete, conditional, or confirmed against the current manager answer and explicitly pinned offer bases. Confirmed does not mean independent audit.
- `frontier`: strongest retaining and assigning offer IDs, the tie amount and supported-range flag.
- `excluded`: unresolved inputs and expired/misaligned offers. Any exclusion means the candidate frontier is not a conclusion about all offers.
- `nextQuestion`: a manager question plus a private explanation of its economic importance. The public question excludes competing bids and the threshold.
- `scenarios`: zero, threshold and one cent on either side, plus the current entered answer when present. They are conditional arithmetic, not predictions.
- `confirmedHighestOfferIds`: populated only when the existing comparison engine accepts all active inputs and current evidence bases.

`POST /api/cases/:id/decision/request {expectedRevision}` saves the generated main manager question, clears the old answer and makes earlier approvals historical. It does not send mail. A repeated request for the same still-unanswered question at its current revision is a no-op. Other stale writes return 409.

The manager's normal `answer` command or MCP `secondlook_answer_distribution` records the amount. The investor must explicitly confirm each competing offer's `distributionBasisSourceId` against that current answer using the existing save-offer operation. The system does not silently assume that every quote includes the same entitlement or record date. Changing the answer makes those old bases stale again.

## Ryan integration

`integration/DecisionWorkbench.tsx` is mounted in the existing investor screen at `/api/case`, with Mat's authorization. Ryan can reuse it for account-selected cases:

```tsx
import { DecisionWorkbench } from '../integration/DecisionWorkbench';
<DecisionWorkbench caseBase={`/api/cases/${selectedCaseId}`} onChanged={refreshCurrentCase} />
```

Render only for an investor. It reads the existing saved offers, displays the comparison, and can save the suggested manager question. It refreshes every four seconds while visible, aborts on unmount, and only displays paired responses with the same revision. The component includes quote entry, editing, reversible withdrawal, and explicit confirmation against the current manager answer. Account selection, invitations and manager response remain in the surrounding UI; the current screen still uses the shared example. Existing offers can also be entered via the new MCP tools.

Preserve an obvious sample label in examples, but keep provider plumbing and repeated implementation explanations out of the main decision. Gaming belongs under supporting evidence: game -> studio/publisher -> contractual fund rights -> LP proceeds -> offer terms. Every unsupported link remains a question; Akta metadata and Steam reviews cannot establish ownership or a distribution amount.

## Acceptance

- $60,000 threshold, exact ties and one-cent changes are covered in tests.
- Dominated offers do not create false decisive crossings.
- Missing fees, differing dates and expired offers remain visible.
- Manager-facing saved question never includes competing bid amounts or private threshold.
- Answer changes do not silently re-confirm offers or approve a transaction.
- UI component inclusion, styling and multi-device browser acceptance remain Ryan integration work.
