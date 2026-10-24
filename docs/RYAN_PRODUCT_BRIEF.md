**Latest design direction — October 24:** Ryan is preparing the marketing site in black and white with neon green/yellow accents. Preserve his actual incoming design and assets; the current earthy app palette is not a constraint on it. Mat/Codex owns reviewing PR27 and integrating Ryan’s work while preserving the working account/review flows. See [marketing integration handoff](MARKETING_INTEGRATION.md). This update supersedes conflicting historical design ownership below.

# Ryan's product design brief

Owner direction: Mat, October 24, 2026. **Ryan owns the final customer experience and visual design.** This is a design brief, not a prescribed wireframe. [PLAN.md](PLAN.md) owns product scope; [BUILD.md](BUILD.md) owns API behavior.

## New real-use integration priority

Mat authorized user-created cases and independent participant access after this original brief. See [REAL_CASE_API.md](REAL_CASE_API.md): add account sign-in/registration, “Start a review,” a case picker, and explicit invitation acceptance. Render role-switching only in example presenter mode. Use the selected `/api/cases/:id` prefix for real account cases. The original gaming walkthrough remains an optional example. Backend implementation does not establish UI acceptance.

## The ambition

Build something a real investor would want to open again tomorrow. The current interface proves the plumbing and gives us a rehearsal path; it is not the final design and does not constrain Ryan's layout, typography, color, motion, navigation or component structure. This is a substantial experience redesign, not just a coat of paint.

**The emotional sequence: I understand what I own → I spot something worth asking → I get the answer → I see exactly what changed in my deal.** Gaming should feel specific and alive. The financial decision should feel calm, clear and trustworthy. Ryan can choose how to express both.

A compelling product slice is today's goal. Full production readiness for real financial records and independently authenticated counterparties is later work. Both facts can be true without making the interface look like a developer demo.

## Design around these moments

These are outcomes, not four mandatory pages. Ryan may combine, reorder or reveal them progressively.

| Moment | What the person should understand or do | Working behavior to retain |
| --- | --- | --- |
| Open the investment | Which fund interest is this, what is the offer, and what needs my attention? | Load the saved case and current offer; show unresolved amounts as unresolved |
| Look inside the fund | Recognize the games, select one, inspect player evidence alongside the studio's business context | Existing Steam/Akta snapshots, dates, sources and honest coverage; no fabricated traction or valuations |
| Ask and get an answer | See a useful proposed question, choose to share it, then see the manager's answer in context | Existing review/explicit-share/manager-answer flow; show waiting and failure states |
| Know what changed | Same $700,000 headline, but the distribution recipient changed: $800,000 becomes $700,000 in scenario gross receipts | Server-calculated delta, stale-approval detection, inspectable previous approval, persistence after reload |

The last moment is the payoff: **same price, different deal**. The app should make the consequence obvious before Ryan explains it. The $100,000 is a fictional contractual scenario, not alpha discovered by the AI. No player metric determines a distribution.

## What belongs in the product

- Lead with the investment, the evidence that matters, the open question and the next action. Use concrete language like “Waiting for the manager” or “Terms changed since your approval.”
- Keep a clear “Illustrative fund and deal” label. Label saved research with its capture date. Put detailed assumptions beside the numbers or in accessible details; do not hide provenance.
- Treat loading, empty coverage, failed research, waiting for an answer and changed terms as intentional states. Keep useful saved work visible during failures.
- Make the history feel like part of the transaction: the question asked, the answer received, the terms reviewed, and the change that needs attention.
- Allow game imagery and expressive presentation when it serves recognition. Use permitted assets, identify the real games accurately, and never imply they endorse us or that the fictional fund owns them.
- Keyboard access, readable contrast, visible focus, reduced motion and a usable laptop viewport remain requirements. Any motion should clarify selection, progress or a changed term.

## What moves out of the main customer journey

Sponsor diagnostics, raw task/trace IDs, engineering explanations, rehearsal/reset instructions, canned-answer insertion and the participant simulator belong in a secondary presenter/developer surface. Keep sponsor attribution and evidence available through an unobtrusive About / Integrations / Evidence detail, including enough proof for judging. They should not dominate the investment screen.

The existing role selector is for a presenter simulating three participants. Moving it into presenter controls does not create real multi-user identities. Keep the current server session checks and do not imply actual verified counterparties.

Do not implement a fake chat, dummy upload, pretend notification or dead-end button to look complete. Anything shown as interactive must work, be explicitly unavailable, or be omitted.

## Ownership and integration

**Ryan / his coding agent:** `src/`, its components/styles, `index.html`, and new public visual assets. Ryan may reorganize or replace the existing UI. No other agent should edit this lane without coordinating with him. Changes to shared dependencies/build configuration require a quick handoff to the integration owner.

**Mat / Codex:** `server/`, `shared/`, provider adapters, data persistence, hosted deployment and integration checks. Preserve these working contracts; request the smallest backend addition if a design needs more data. Do not turn the UI project into a new scaffold or copy server secrets into frontend code.

Use relative `/api/*` URLs so Vite's proxy and the hosted same-origin app both work. Read existing components for request shapes and [BUILD.md](BUILD.md) for contracts. Preserve login/logout, server-owned hosted roles, `expectedRevision`, explicit sharing, error handling, saved evidence and integer-cent server calculations. Never recreate the authoritative financial result in frontend state.

There is no need to reproduce the current screen layout, step navigation, prominent notices, font, colors or copy. No Ninoo redesign is required unless the organizer resolves the conflicting instructions that way; the optional bridge is already separate.

## Acceptance before calling the new experience ready

1. An unfamiliar person can identify the offer and their next useful action within one minute, without an architecture explanation.
2. Ryan can use his own game knowledge to make one evidence investigation interesting, without claiming more than the source shows.
3. The same selected game connects through the shared question and manager answer to the deal. No disconnected gaming dashboard.
4. All visible actions use the working API; waiting, retry and stale-version handling preserve prior work.
5. A saved answer supports a review; changing the distribution recipient visibly invalidates the old approval and shows the server's $100,000 scenario difference.
6. Reload preserves the question, answer, offer and history. Prior approval remains inspectable.
7. Sponsor details and presenter controls are reachable but do not crowd the main experience. Synthetic records and saved captures remain honestly labeled.
8. Run `npm test` then `npm run build`; verify the complete flow against the exact deployed commit on Ryan's laptop and rehearse aloud within three minutes. A beautiful screenshot or passing build alone is not acceptance.

## Paste into Ryan's coding agent

```text
I own the final customer UI for Second Look. Read AGENTS.md, docs/PLAN.md,
docs/RYAN_PRODUCT_BRIEF.md, docs/TEAM_BOARD.md and docs/BUILD.md.
Work on a codex/ branch from current main, preserving existing local changes.
I own src/, index.html and new public visual assets. The current interface is
an engineering reference, not a wireframe I must preserve. Design a cohesive,
striking investor product around the fund offer, recognizable games, contextual
research/question/answer, and the financial consequence of changed terms.
Use the real existing API and server-computed amounts/history. Preserve hosted
login, explicit human sharing, revision checks, honest evidence and error states.
Keep sponsor/debug/presenter controls secondary. Do not invent data, interactions,
backend capabilities or real participant identities. Coordinate changes outside
my UI lane. Show me the design direction, implement the full working journey,
run tests/build, and hand off the exact commit for deployment and rehearsal.
```
