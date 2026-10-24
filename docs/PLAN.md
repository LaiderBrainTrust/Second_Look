# Second Look — the team plan

**Deal Flow, Betaworks · October 24, 2026 · Track 4: Funds**

**Build one complete experience: look through a gaming fund to the games people play, ask the manager the right question, then make sure the deal you approve is still the deal you receive.**

This is the canonical product and strategy plan. Read it before changing scope. Implementation contracts are in [BUILD.md](BUILD.md), setup in [TEAM_START.md](TEAM_START.md), assignments in [TEAM_BOARD.md](TEAM_BOARD.md), and the live presentation in [GAMING_BUILD.md](GAMING_BUILD.md). Older proposals in `archive/` are historical, not instructions for today's build.

Repository: [LaiderBrainTrust/vc_hackathon](https://github.com/LaiderBrainTrust/vc_hackathon). Team branch: `main`. [PR #1](https://github.com/LaiderBrainTrust/vc_hackathon/pull/1) is merged. Further work uses small reviewed branches.

## Product experience directive — October 24

**Ryan owns the final customer-facing product experience. The current hosted interface is a working engineering and rehearsal reference, not the finished UI or a design to merely reskin.** Read [Ryan's product brief](RYAN_PRODUCT_BRIEF.md) for creative ownership, functional boundaries and acceptance. Preserve the engine; give Ryan room to design the product.

Lead with the investment and a meaningful next action. Let the user investigate a recognizable game, ask the manager, and see the consequence of changed terms. Keep diagnostics, raw sponsor receipts and presenter controls in secondary surfaces. Keep synthetic-data labels and dated evidence honest. The final journey must run on the real APIs and persist changes; it must not be a presentation-only mockup.

The intended result today is a compelling, functioning product slice. The existing hosted team login is not independent real-world counterparty authentication; full production readiness remains a separate claim.

## 1. The product in ordinary language

An investor is considering selling an interest in a venture fund. The last fund report is old. The games behind some of its investments are still being played, reviewed and updated. There may be useful evidence outside that report—but game popularity does not tell you what the investor legally owns or what cash a sale includes.

Second Look helps the investor inspect that outside evidence, ask the fund manager for the missing commercial facts, and review the resulting offer. It remembers the source, the question, the answer and the exact version of the deal. If the buyer changes who receives a distribution, the prior approval stops applying and the dollar consequence is visible.

**Our demo is one product, with two connected strengths:**

- **Gaming intelligence:** a teammate who understands games can explain the player evidence, the studio, the publisher and the limits of the signals. This is a substantive part of the product, not a decorative theme.
- **Investment follow-through:** the investor turns that evidence into a real diligence question and a versioned decision. The work does not end with an AI paragraph.

## 2. The customer, pain and financial value

Primary user: an LP, family office or fund-of-funds analyst evaluating a proposed sale of a fund interest. The fund manager/GP provides supporting information; the buyer supplies the offer terms.

The pain we are testing is the gap between “I read the report” and “I know what this particular offer gives me.” It involves stale information, uncertainty about underlying rights and cash, repeated requests for evidence, and decisions that quietly become outdated after terms change.

The demo's concrete consequence is deliberately simple: a $700,000 purchase payment plus a $100,000 distribution retained by the seller means $800,000 in scenario gross receipts. If that distribution instead goes to the buyer, the seller receives $700,000. The purchase price headline did not change; the economics did. This is a fictional contract scenario with zero purchase-price adjustment, excluding tax, fees and timing. It is not a claim that we found or earned $100,000 for a customer.

A VC/GP could benefit from a clear record of what an LP or secondary buyer requested, what the manager answered and which terms remain unresolved. That is a possible second buyer, not a validated purchase commitment. We should lead with the LP's decision in Track 4 rather than claim to solve all VC workflows.

## 3. Why this is more than a document chat

Competitive check: [COMPETITION.md](COMPETITION.md). Harmonic already has AI research and continuous company context; DiligenceVault already has manager diligence, collaboration, versioned knowledge and MCP. Those features alone are not our differentiation. Our narrow hypothesis is a source-linked path from a specific operating asset, through a manager-confirmed cash assumption, to the LP sale terms and exact approval it affects. It is not a claim that no competitor can do this.

Claude or ChatGPT can help interpret documents, research a company and write the proposed question. We use a model for exactly that. We should not pretend those abilities are unique.

The prototype's additional behavior is observable:

1. It retrieves and stores outside evidence rather than assuming it was in the uploaded documents.
2. It pins that evidence and the offer revision to a Roundtable task and versioned files.
3. The investor explicitly chooses whether to share the proposed question.
4. A separate participant role supplies the answer; the model cannot invent an authoritative manager response.
5. Human commands, not model prose, change financial terms and approvals.
6. A changed case makes the old approval historical. The old record remains inspectable, and the current dollar effect is calculated deterministically.

A coding agent could build competing software. Our hypothesis is that a useful maintained workflow, appropriate access controls, repeat use and trusted integrations can justify a product. The hackathon does not establish a moat or prove customers will pay. Our response to the objection should be the live changed-offer sequence, not a claim that general AI cannot reason.

## 4. The exact demo scenario

The fund, ownership, NAV exposures, offer, distribution and manager answer are synthetic. The named games and studio research are real external inputs. We do not claim any real fund owns these companies.

| Game | Studio used for research | Fictional share of fund NAV |
| --- | --- | --- |
| Tiny Glade | Pounce Light | 45% |
| Balatro | LocalThunk | 35% |
| Another Crab's Treasure | Aggro Crab | 20% |

`fundNavExposurePercent` means a share of this fictional fund's NAV. It is **not** studio equity ownership, a revenue share or the user's LP ownership percentage. Never multiply it by game revenue to invent LP proceeds.

The report cutoff is September 30, 2026. For Steam, compare at most 100 recent English reviews in each of two windows: the preceding 30 days and the period after the cutoff through the observation time. Display sample sizes and dates. Only compute a percentage-point difference when both samples have at least 20 reviews. Display current players as a single observation, never a growth rate.

Current observations need not produce a dramatic warning. The verified first checks showed small changes and no matching post-cutoff Akta news on the returned page. The product must say so. Akta's business profile can still reveal questions worth asking about business model, publisher relationship and economic rights; its generated summary is not a verified cap table.

Investigation order is a disclosed prototype rule: a sample decline of at least 10 percentage points first, then missing Steam evidence, then other holdings ordered by sample change and fictional exposure. This is not a validated investment score or expected-return ranking.

## 5. What the user does

**Step 1 — Inspect the games.** Check the three holdings, select a game, read the player evidence, and inspect Akta's studio profile/news. Select “Turn evidence into a manager question.”

**Step 2 — Ask the manager.** The app stores a case-specific research run. Roundtable saves the input version and assigns the reviewer; Nicrron drafts a focused question and explanation; PRISM records the actual model request/response. The result remains a proposal. The investor reads it and explicitly shares it. Sharing replaces the case question and requires a fresh manager answer.

**Step 3 — Review the deal.** The shared question retains its selected game, studio and source snapshot. The decision screen follows that game to the manager-entered cash assumption and current distribution recipient. Each new approval preserves the exact question, answer and game context, even when a later question replaces them. The presenter inserts an explicitly labeled fictional manager response; the model does not invent one. The manager role enters the fictional distribution response. The investor reviews the calculated gross proceeds and approves the current version. The buyer role changes the distribution recipient. Back in investor view, the prior approval remains on record but no longer applies; the $100,000 difference is visible. Reload to show persistence and print the decision record.

Today's participant roles are simulated. Local development uses a role header; the public hosted app uses a secure team session with a server-owned role and case grant, and ignores forged role headers. Neither establishes the identities of real counterparties. Move the simulator into presenter controls; preserve the server's projections and checks.

## 6. Sponsor use and verified state

All four sponsors are required by the live Devpost Overview. [DEVPOST_RULES_CHECK.md](DEVPOST_RULES_CHECK.md) records the Chrome check of all relevant event tabs and the linked live guide. Functional API use and sponsor-specific prize eligibility are separate checks. Resources directly links the guide requiring Ninoo Builder and Marketplace; standalone API paths in the same guide do not clearly waive those requirements. Preserve the current backend and continue Ryan’s UI while the organizer resolves that conflict.

| Sponsor | Real role in this product | Current evidence |
| --- | --- | --- |
| Akta / Wokelo | Resolves studios, retrieves business/ownership descriptions, and checks dated news | Live profiles and news lookups verified for the three studios. Empty news results are displayed honestly. |
| Roundtable | Versioned evidence files, task assignment to a separate reviewer identity, saved result and reconciliation | Live app-specific task/input/output flow verified. Restricted team bot credentials are now saved in repository Codespaces/Actions; teammate runtime acceptance remains to be checked. |
| NicrronNinoo | Model call inside the reviewer to propose the manager question | Live Nicrron request and model result verified. Builder/Marketplace interpretation still requires sponsor/organizer confirmation. |
| PRISM / Block Convey | Trace of that actual model call, including evidence payload, output, model and latency | Real trace accepted; PRISM reports `live_connected: true`, `app_connected: true`, recorded application traces, and no blocked setup step. |

Steam is an additional external source, not a replacement for a sponsor. The Akta award story should explain how outside company context changes the question asked, including the difference between game success, studio economics and fund rights. Do not claim an empty news search discovered a material event.

The provider summary in the UI reports calls observed by the current API process. After a server restart, saved task/trace receipts remain evidence even if a provider tile has not yet seen a new request in that process.

## 7. X1's role and the “build with X1” lane

Mat's X1 work informs the product hypothesis: coordination across people and time needs durable state, permissions and explicit approvals. The app currently uses its own SQLite case state and Roundtable's versioned task artifacts. **It is not connected to X1.** Do not label those records as X1 receipts or imply real household data is present.

A bounded next integration would import one authorized synthetic investment/report source through X1's MCP, preserving its source identity and access limits. That would demonstrate an external app using X1 as a permitted system of record. It must not require copying X1's private codebase or broadening account access.

References: [Build with X1](https://x1wealth.com/build), [custom app connection guide](https://x1wealth.com/connect/other), [agent skills](https://github.com/x1wealth/x1-agent-skills). Discover actual available tools and permissions at runtime; a coding agent's connection does not automatically authorize this web app.

For today's critical path, finish the team setup and coherent presentation first. An X1 read is an optional extension only if it can be verified without destabilizing the working demo and the organizer permits existing infrastructure. We are not building a new X1 platform, household sharing system or MCP server during this event.

## 8. What is built, and what is not

**Built and locally exercised:** React/Vite UI; Express API; three-game evidence scan; saved studio profiles; bounded news results; investigation ordering; versioned Roundtable/Nicrron review; PRISM trace; explicit sharing; manager answer; deterministic cash comparison; stale-revision rejection; visible historical approvals; SQLite persistence; printable decision record; setup script and private Codespaces instructions.

Recorded verification: 29 tests pass, TypeScript/Vite build passes, the actual gaming review completed, and the browser walkthrough covered the financial sequence and reload. A 390px mobile check found no horizontal overflow. The PRISM integration check caught and fixed a JSON field-order comparison bug; regression tests also prove that a genuinely different trace ID remains rejected.

**Hosted and verified:** public HTTPS access with a protected team login, server-owned fictional participant roles, persistent database, complete browser flow, restart recovery, and fresh calls through all four sponsors. See [DEPLOYMENT_RECEIPT.json](DEPLOYMENT_RECEIPT.json) for the exact deployed source and checks. This records previous verification, not acceptance of a future redesign.

**Not built/verified:** final customer-facing design, independently authenticated counterparties, real investment/document import, valuation models, executed transactions, true customer returns, teammate Codespace acceptance, Ryan laptop acceptance and spoken rehearsal, submission/video completion.

## 9. Team execution and ownership

Mat has assigned the final UI and product design to Ryan. Mat/Codex owns backend integration and deployment. See [TEAM_BOARD.md](TEAM_BOARD.md) for file ownership and acceptance; other agents must not treat the original scaffold ownership as a reservation of the UI.

- Mat: financial narrative, sponsor/access resolution and integration acceptance.
- Ryan: owner of the final UI/product design per Mat, plus intended lead presenter and gaming-domain reviewer. Creative control includes layout, navigation, typography, color, motion and component organization. Preserve working contracts, not the old screen design. Ryan's own acceptance and final branch/commit are still to be recorded.
- Other teammates: choose concrete lanes from the board, especially setup verification, founder brief, eligibility clarification, video and submission. These are proposed responsibilities until accepted, not claims that anyone has already completed them.
- Coding agents: read this plan and BUILD.md, state the files you intend to edit, preserve other work, and use a bounded branch. Do not rebuild the scaffold, substitute sponsors, add fake findings or deploy publicly to “help.”

## 10. Critical path to 4 PM Eastern

| Time gate | Result needed |
| --- | --- |
| By 2:11 PM | Ryan's customer experience integrated with the working API; sponsor receipts retained; one coherent complete walkthrough |
| 2:11–2:45 PM | Presenter rehearses; fix only concrete failures; finish founder brief and capture video |
| 2:45 PM | Feature freeze. No new platforms, auth rewrite or provider migration unless needed to unblock the actual submission |
| By 3:30 PM | Submit early: project description, Track 4, source repository, usable demo link, founder brief, ≤3-minute video and sponsor list |
| 3:30–4:00 PM | Verify submitted links/access and correct submission issues |

The working engine is implemented. Ryan owns the cohesive customer experience, followed by integration and rehearsal. **Mat authorized a bounded expansion on October 24 while Ryan works:** competing-offer comparison, a term/consent checklist, and several assigned questions from Darren's roadmap. These are additive backend APIs; the existing main journey remains usable without creating workflow items. See [WORKFLOW_API.md](WORKFLOW_API.md) and [ROADMAP.md](ROADMAP.md). No unrelated platform or authentication rewrite is included. Preserve the feature freeze, rehearsal and submission gates above.

**Live link is available:** https://x1cloud.tail6fbca0.ts.net/ is public through HTTPS Funnel, with a separate team login. It does not require judges to join Mat's tailnet. Keep the working backend. Ryan's UI must be merged, built, deployed and checked at this URL before calling that design live. See [RYAN_DEMO.md](RYAN_DEMO.md) for access and operations. Use 4:00 PM Eastern as the hard deadline despite conflicting later text on Devpost; target submission at 3:30 PM.

## 11. Commercial hypothesis and validation

Possible commercial offer: a workspace per investment team for recurring LP/secondary diligence, with retained evidence and changing-term review. A paid per-case pilot is a reasonable test before committing to annual pricing. No price, market size or demand has been validated by this build.

What to ask LPs/GPs at the event:

- Tell us about the last secondary review. What did you have to chase, and who chased it?
- Which term or supporting answer changed after someone had already reviewed the transaction?
- How did you know everyone was looking at the same version?
- Would you give this workflow a redacted/synthetic case, use its question record with a counterparty, or agree to a paid pilot? Who could approve that?

Evidence to collect: actual interview notes with permission, a named workflow owner, observed review time, missing questions closed, changed terms caught and willingness to pilot. Do not fabricate the five pre-event interviews requested by the event or substitute teammates' enthusiasm for customer evidence.

The gaming module can be a useful wedge and relationship artifact if people want to use it. Do not assert that Steam analytics is a unique market category. An open-source release is a separate team ownership/licensing decision; no license has been selected merely by sharing this private repo. Reuse X1 only through agreed, authorized interfaces.

## 12. Submission and judging story

- **Design:** three explicit steps and one financial consequence. Judges should understand the job before hearing an architecture lecture.
- **Uniqueness:** the connection between domain-specific outside evidence and a versioned multi-participant decision. Do not claim originality for a game leaderboard or an AI memo alone.
- **Execution:** show real provider calls, pinned sources, the saved answer, a changed term and the historical approval. Label synthetic data and failed/missing coverage.
- **Business feasibility:** identify the LP buyer and concrete review process. Present interview evidence actually collected and pricing as a hypothesis when untested.
- **External-data award:** show the Akta business context alongside Steam evidence, then the more precise manager question it enables. No fabricated valuation, funding status or causal claim.

Submission checklist: name/description; Track 4; sponsor award selection; founder brief (problem, customer, genuine interview evidence, market-sizing assumptions, alternatives, business model, why now); tools/sponsors; code link; accessible demo link; ≤3-minute video. The content prize additionally asks for social posts/tags and submission links; posting is owned by a teammate with permission, not automatically performed by this coding agent.

## 13. What we deliberately defer

Global game discovery, a new general-purpose dashboard, SPV creation, secondary marketplace execution, automatic valuation, fabricated alpha scores, Minutes integration, autonomous outreach, production financial records, a replacement for the team's existing tooling, and an X1 platform expansion. Revisit after the event only if customer evidence earns the work.
