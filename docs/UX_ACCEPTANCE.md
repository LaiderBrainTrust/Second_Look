# First-use UX acceptance

The task is an end-to-end usability review with implementation, not just a visual polish pass or a successful scripted demo. Mat should not need to point out each screen individually.

## Acceptance questions

On every reachable screen and important state, a first-time nontechnical investor should be able to answer:

1. What am I looking at, and why does it matter to my sale?
2. What is known, what is missing, and who needs to supply it?
3. What is the next useful action, and what happens when I take it?
4. How do I recover from an error, missing answer, changed terms or an interrupted draft?

Inspect actual browser output on desktop and mobile, including expanded optional sections. Follow the dogfood skill for browser-first discovery and Emil's design-engineering skill for implementation review. Test each role separately. Keep sample financial values explicitly fictional and preserve source references, permissions and revision checks.

## October 24 corrective pass

Baseline: `f4345996a6e1f808dcf2845993b4bd92d674a716`.

| Before | After | Why |
| --- | --- | --- |
| A disabled Save button leads the blocked review; the recovery button touches the row above | The primary button requests the missing answer or terms; all actions share a spaced group | Lead with the action the user can take |
| RECORDED and STILL NEEDED rows repeat field names without their meaning | Supporting detail names the actual payout recipient and recorded adjustment | Explain the result, not an internal status |
| Generic text points to missing information below | A specific list explains each blocker next to its recovery action | Eliminate guessing |
| Status rows and the full answer expand the review even when the user needs one action | Supporting details sit behind a labeled disclosure | Keep the next step easy to find |
| An empty decision history repeats instructions | History appears when there is something to show | Avoid empty scaffolding |
| Conversation gives two different directions for trying the fund role; buyer sees investor-oriented copy | One direct action for the investor; role-specific explanation for the buyer | Match instructions to the participant |
| Empty workspace and open case form repeat the create button | One creation action appropriate to the current state | Remove duplicate controls |
| Comparison editor and table use independent buttons | Shared action groups keep consistent spacing and wrapping | Fix the pattern beyond one screenshot |

## Browser coverage in this pass

All writes used an isolated local HTTPS instance with synthetic records. The public shared example was not reset or edited.

| Surface/state | Evidence and result |
| --- | --- |
| Homepage, team access, sign-in and create-account views | Opened in browser; created an isolated synthetic account |
| Empty workspace, populated workspace, new-case form | Visited both states; created a synthetic case with unknown adjustment and recipient |
| Investor offer, research, conversation, review | Visited all four views |
| Fund contact and buyer roles | Visited each role's offer/conversation flow; submitted the prepared answer and revised offer locally |
| Review without fund answer | Recovery action leads to the conversation; no disabled Save offered |
| Review with unknown adjustment and payout recipient | Specific missing terms shown; unknown is not treated as zero |
| Review ready, saved, changed and refreshed | Full 800k to 700k walkthrough retained the 100k difference; saving and downloading succeeded |
| Additional requirement blocks review | Seeded a local pending-consent fixture; recovery button scrolls and focuses the requirement; resolving it makes Save available |
| Optional comparison | Expanded empty state and editor, reused current offer; action groups inspected |
| Optional funding and X1 source lookup | Opened both; personal case preserves owner and does not show fictional preset; example shortcuts visible |
| Invalid case link | Clear unavailable message and working return to cases |
| Mobile 390px | Checked review, research and form states; no page-width overflow in inspected states |
| Browser errors | No JavaScript errors reported in the exercised flows |

## Explicit limits

This pass does not prove every possible state. Fresh provider timeouts, X1 OAuth consent, cross-account invitation redemption, every research result variation, keyboard-only completion of every form, and Safari/device coverage were not re-exercised. Existing automated tests are separate evidence, not a substitute for these checks. Do not describe the entire product as exhaustively verified or production-ready on the strength of this pass.

## Future changes

Before calling a journey complete, maintain this matrix with actual results and outstanding gaps. Check initial, loading, empty, populated, validation-error, permission-denied, stale and saved states where applicable. Preserve the submitted demo story unless Mat explicitly asks to change it. A passing build, a screenshot of one page, or the three-minute demo path is not a full UX acceptance check.
