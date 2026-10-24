# Team board — claim a bounded task

Read [PLAN.md](PLAN.md) first. This board records proposed work, not automatic delegation. Update the owner when someone accepts a task; tell the team which files are yours before editing.

| Priority | Task | Owner / state | Acceptance |
| --- | --- | --- | --- |
| P0 | Background review recovery and safe release path | Mat/Codex — merged and deployed; 34 tests/build and live checks passed | [BACKEND_READINESS.md](BACKEND_READINESS.md); queued results survive closed browser/restart, unchanged case, preserved API |
| P1 | Downloadable decision record | Mat/Codex backend implemented; Ryan owns button integration | [DECISION_RECORD.md](DECISION_RECORD.md); HTML/JSON, investor-only, guarded revision, original approval history |
| P0 | Final customer UI and product design | Ryan — assigned by Mat; implementation/acceptance pending | [RYAN_PRODUCT_BRIEF.md](RYAN_PRODUCT_BRIEF.md); cohesive real-API journey, useful in the first minute, exact deployed commit verified |
| P0 | Core gaming → review → changed-offer workflow | Mat/Codex — implemented and locally verified | 29 tests/build; live source/task/trace receipts; browser financial sequence. These verify the reference implementation, not the future redesign |
| P0 | PRISM setup | Mat/Codex — live verified | Actual model trace accepted; setup doctor reports live/app connected |
| P0 | Team Roundtable credentials | Mat/Codex — configured, restricted grants verified | New bot keys in Actions/Codespaces; access to reporting/shared-notes banks denied. Workspace co-owners remain fully privileged |
| P0 | Fresh teammate setup | Unclaimed — needs teammate's environment | Follow README on `main`; doctor; live task; screenshot/URL and exact commit. Codespaces secrets exist for all four sponsors |
| P0 | Judge-accessible demo link | Mat/Codex — deployed and externally verified | See DEPLOYMENT_RECEIPT.json. Team login, persistent database, full browser path and server restart passed; Ryan still opens link on his laptop |
| P0 | Ninoo Builder/Marketplace eligibility | Mat / sponsor conversation — unresolved | Resources links the stricter guide; obtain organizer clarification and complete any required listing. See DEVPOST_RULES_CHECK.md |
| P0 | Gaming narrative + spoken rehearsal | Ryan proposed; confirm acceptance | Explain one game accurately and complete a timed ≤3-minute run without unsupported financial claims |
| P0 | Founder brief | Unclaimed | One page with actual customer evidence or explicit gaps, buyer, alternatives and commercial hypothesis |
| P0 | Video and Devpost submission | Unclaimed | ≤3-minute video, correct repo/demo links, sponsor list; submit by 3:30 PM and verify access |
| P1 | Concrete rehearsal bug fixes | Mat/Codex + claimed UI owner | Reproduce, make smallest fix, targeted tests/build, replay affected step |
| P2 | One synthetic X1 import | Unclaimed — optional, after critical path | Authorized read, actual source ID/receipt, truthful labeling, organizer permits reuse; otherwise omit |
| Later | Production auth, multi-case/team service, measured commercial pilot | Not today's commitment | New scope based on customer evidence |

## File ownership while Mat/Codex finishes this lane

- Ryan / his coding agent owns `src/`, `index.html` and new public visual assets for the final product. He may reorganize or replace the current UI. Other agents coordinate before editing these files.
- Mat/Codex owns `server/`, `shared/`, provider adapters, backend tests, setup and hosted deployment. Request API changes rather than reimplementing domain logic in the UI.
- Coordinate shared dependencies and build configuration across both owners. Record Ryan's actual branch/commit when available; do not assume his work is deployed.
- Plan/docs: `docs/PLAN.md`, `docs/BUILD.md`, `docs/GAMING_BUILD.md`, `README.md` currently maintained by Mat/Codex. Teammates can propose edits in a branch.
- Good independent lanes: add `docs/FOUNDER_BRIEF.md` with genuine evidence; prepare a video outside source; verify setup and report results; resolve sponsor interpretation.

A useful teammate handoff says: owner, branch/commit, files changed, commands/checks run, what still fails, and the next action. Do not paste API keys into the board or code review.
