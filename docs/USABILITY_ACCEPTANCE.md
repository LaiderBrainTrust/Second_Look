# Usability pass — October 24

This pass preserves the visual design and improves the ordinary customer journey. These are synthetic browser acceptance checks, not evidence that real customers find the product intuitive.

## Customer path

1. Sign in and open **Your sale reviews**.
2. Choose **Review a sale offer**. Enter the actual terms, explicitly select who receives distributions, and leave an unknown adjustment blank instead of assuming zero.
3. Open **The conversation**. Create and copy the fund manager's invitation beside the question. Send it yourself; the application does not send an email.
4. The manager joins with a separate account and opens directly on their question. Their answer appears for the investor automatically unless the investor has unsaved work.
5. Open **Your decision**, check the proceeds and supporting answer, address any additional requirements, and record the review. Download the dated record if needed.

## Verified in isolated hosted mode

- New investor account → new review → one-use invitation → separate manager account → answer → investor's updated proceeds → saved review → reload → HTML download.
- A pasted `$700,000.25` offer and `$100,000` manager-confirmed distribution yielded `$800,000.25` with an explicit zero adjustment and seller-retained distribution.
- Manager reopening from the review list lands on the conversation.
- Cancelling navigation preserves an unfinished manager answer.
- Two additional conditions were created in the synthetic case through the existing API. After drafting both, saving the first preserved the second draft and its navigation warning. Cancelling navigation retained it. Saving the second cleared the blockers and enabled recording the review.
- Invitations become secondary once the manager has joined. Desktop and narrow-screen layouts were inspected.
- 92 automated tests passed; TypeScript and production build passed. Independent review identified stale polling, participant defaults, draft reset and blocker recovery issues; these were corrected.

## Behavioral safeguards

Older or disposed polling responses cannot replace newer displayed revisions. Background updates defer while a form has unsaved changes. Explicitly loading the latest version asks before discarding drafts and only resets them after a successful load. Saving one additional requirement preserves drafts in other unchanged items. Server-side revision and role checks remain authoritative.

## Next human check

Give someone who has not watched development a synthetic offer and ask them to start a review, get an answer, and explain the displayed proceeds without coaching. Note the first hesitation rather than explaining the interface. This human comprehension test and a timed rehearsal on the presentation laptop remain unverified.

This pass does not add automatic invitation delivery, account recovery, document parsing, or transaction execution. Existing customer-readiness boundaries still apply.
