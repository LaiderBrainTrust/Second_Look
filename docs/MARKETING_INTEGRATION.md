# Ryan's marketing site — integration handoff

Owner direction: Mat, October 24. Ryan is preparing a **black-and-white marketing site with neon green/yellow accents**. Preserve its actual composition, typography, colors and assets. Do not approximate it from this description or recolor it to match the current warm app theme. PR27's presentation improvements are not Ryan's design and do not supersede it.

At this handoff, no Ryan marketing branch or PR was visible in LaiderBrainTrust/Second_Look. Integration is pending the actual contribution. A saved plan is not an automatic GitHub watcher.

## When the contribution arrives

1. Read its actual branch/diff and start from current `main`, which contains the authenticated customer journey and draft protections. Preserve Ryan's files; resolve conflicts deliberately instead of replacing whole files with an older UI snapshot.
2. Integrate the marketing surface with working entry points into the app. Keep account sign-in/registration, existing case links (`/#case=...&view=...`), one-use invitations, and X1 callback returns working. Choose routing based on the actual submitted implementation; do not assume a second backend or require a rewrite.
3. Scope marketing styles to its surface. Its black/white/neon identity is the intended direction; broader app styling can adopt its actual tokens where appropriate without losing readable financial status or focus states. Avoid global `:root`, `body`, `button`, or heading overrides leaking unexpectedly into account forms and reviews.
4. Wire every visible CTA. Keep claims tied to implemented behavior, clearly label synthetic examples, and do not imply a price-plus-distribution illustration is guaranteed net cash or investment performance.
5. Run tests/build, inspect desktop and phone, and verify sign-in → review → conversation → decision plus invitations and X1 return navigation. Check deployed SHA separately from a merged PR.

## PR27 review corrections

| Before | After | Why |
| --- | --- | --- |
| Appended desktop grid overrides mobile stacking | Restore tablet sizing and one-column phone layout in the new CSS block | On a 390px viewport the sale column computed to 0px and its figures overlapped |
| Header links break mid-label on narrow screens | Allow header wrapping and keep navigation labels intact | Keep navigation readable without shrinking the financial view |
| Illustrated total says “What you actually receive” despite unconfirmed distribution | “Illustrative cash before costs” | Preserve the useful arithmetic without implying confirmed net proceeds |

Review keeps Claude's presentation hierarchy, numbered steps, favicon and game-cover fallback. Marketing integration remains open until Ryan's actual code is available and tested.
