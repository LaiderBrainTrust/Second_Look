> Build-day update: the selected example is a fictional gaming fund with real Steam/Akta research. See [GAMING_BUILD.md](GAMING_BUILD.md) for the implemented scope and remaining sponsor dependencies. This original proposal also describes capabilities outside the current build.

# Second Look: team proposal and build plan

**For a team vote, not an agreed build.** Prepared October 24, 2026. Track 4: Funds. Proposed sponsor award: Best Use of External Data. Submission deadline: **4:00 PM Eastern today**. Working name only; naming availability has not been checked.

## Read this first

**We help an investor resolve the questions that matter before selling a venture-fund stake—and keep the decision current when the deal changes.**

An LP is an investor in a fund. A GP is the team managing that fund. Selling an existing fund investment to another investor is a secondary sale.

The investor may be considering an offer using an old quarterly report. We combine their authorized investment records in X1 with new company information from Akta, identify a consequential question, get a response from another participant, and keep that response tied to the specific offer. If the buyer changes a material term after the investor has approved a proposed response, the app requires another review.

**The demonstration:** the offer changes; the old approval visibly stops applying; the correct person sees what changed and what they must review. Close the browser, return as another participant, and the same unfinished work is still there.

This is a new small application built today on existing services. It does not require teammates to understand or fork X1's monorepo. Mat owns the X1 connection. The new product owns its offer-specific workflow.

### Thirty-second team pitch

> Someone offers to buy your investment in a venture fund. Your report is months old, different people have different answers, and the deal keeps changing. We connect your investment records to fresh company information, get the important questions answered, and keep track of exactly what you approved. If the terms change, the app catches what that means before an old decision gets reused. Today we demonstrate one offer, one important question, and one change that matters financially.

### Why vote yes—or no

| Vote yes if… | Vote no or reduce scope if… |
| --- | --- |
| You want a financial workflow with a visible consequence and substantial backend reuse. | You want to build a new marketplace or an autonomous investing product today. |
| We can prove all sponsor connections and a useful X1 read quickly. | Access/setup consumes the first 30 minutes without a usable path. |
| We can show a real external-data finding leading to a question and a human-reviewed answer. | We only have a PDF summary and decorative company profiles. |
| We can build and test persistent versions, roles, and stale-review handling. | The central change/approval behavior would be a scripted animation. |

Recommendation: vote **yes, subject to the short access spike**. It is a plausible external-data-award entry, not a guaranteed winner or a proven new market.

## 1. User, value, and commercial hypothesis

Initial user: an investment professional at a small family office or LP advisory practice evaluating an existing offer for a venture-fund interest. A secondary advisory team is another plausible buyer. VC fund staff are counterparties who answer questions; they are not automatically the paying customer.

The job is to establish the economics and unresolved conditions of an offer, gather the missing answers, and keep the decision synchronized with the latest terms. The potential value is fewer overlooked terms, less repeated coordination, and better-informed negotiation. No financial gains or customer outcomes have been demonstrated for this proposal.

Recurring business hypothesis: a professional handles these questions across multiple clients and fund interests, including subsequent reports and revised offers. An occasional individual seller is a weaker annual-subscription customer. Test an initial **$500 per team per month** price hypothesis with professionals; it is an interview prompt, not a validated price or X1 pricing change. No transaction-based fee is assumed.

Reach the first ten prospective customers through family-office advisors and secondary specialists willing to review one completed case. Do not count event attendance or a friendly reaction as a customer. Ask for an agreed pilot with a real owner and next date. Obtain permission before using their documents or quoting them.

Four quick questions for people at the event:

1. Tell us about the last fund-interest sale or offer review you handled. Where did the latest terms and unanswered questions live?
2. Which unanswered question actually changed the deal, and who had to answer it?
3. What do your current tools already handle well? What still needs manual chasing or checking?
4. Would you try this on the next case? Who would own it, and what result would justify paying?

Record actual answers. No interviews for this specific proposal have been established. The founder brief must say that if it remains true. A market-size calculation should use sourced buyer counts and explicit assumptions; there is no verified TAM in this proposal.

## 2. The complete demonstration

Use a fictional fund, fictional LP ownership, fictional offers and fictional fund-manager correspondence. Use actual Akta results about real companies, clearly labeling the fund's ownership of those companies as fictional. Pick the company after confirming the API returns usable evidence. Do not manufacture a sponsor result.

| Beat | What the audience sees | What must really happen |
| --- | --- | --- |
| Start | LP sees a $700,000 offer and an older report. | Application reads an authorized synthetic document through X1 and retains the source identity. |
| Discover | A subsequent company event prompts a distribution question. | Akta returns dated, attributed evidence for the correct company. A public acquisition announcement is a question trigger, not proof of closing, proceeds or entitlement. |
| Coordinate | LP asks the fund manager whether a distribution is expected and which interest it belongs to. | Human explicitly shares the bounded question. Another authenticated participant receives and answers it. Roundtable performs an actual research/review task handoff. |
| Review | A synthetic response confirms a $100,000 distribution attributable to this interest; offer v1 explicitly lets the seller retain it, without reducing purchase payment. | A human verifies the response and terms. Deterministic code shows $800,000 gross receipts. LP approves the proposed response to offer v1. |
| Change | Buyer submits offer v2 with the same $700,000 payment but distribution entitlement assigned to the buyer. | A new version is stored. Gross receipts to seller become $700,000 under these explicit assumptions. The earlier review is historical and cannot authorize the new response. |
| Resume | Another session opens: “Terms changed: review the $100,000 difference.” | Persistent state, next owner, source links and old/new terms survive reload. LP/advisor can revise and approve a response to v2. |

The $100,000 is a **difference between fictional contract scenarios**, not recovered money, predicted profit or fair value. Show fees, taxes, timing and purchase-price adjustments as excluded or unresolved; never imply this simplified comparison is complete net proceeds. If the price is adjusted for distributions, include that adjustment explicitly or withhold the total.

### Three-minute run of show

- **0:00–0:25:** Explain the LP's decision and the old report. Show the current offer immediately.
- **0:25–0:55:** Show the Akta finding, date and source, then the exact question it creates.
- **0:55–1:25:** Second participant submits the prepared fictional response. LP sees the grounded comparison and approves a proposed response.
- **1:25–2:05:** Buyer changes the distribution term. Show the monetary difference and the obsolete approval.
- **2:05–2:30:** Reload in the other participant's session. Show what remains and who owns it; demonstrate one denied attempt to access private LP material.
- **2:30–2:55:** Show the new response and identify the paying customer, sponsor roles and remaining validation.

This is a proposed run of show, not a ready demo. Rehearse the complete path on the presentation machine. A prepared capture is a labeled fallback, never evidence that a failed live integration worked.

## 3. Why this is more than uploading PDFs to ChatGPT

A strong assistant can assess documents, find news and draft questions. That is the baseline, and the product should use that capability.

The new application must add persistence across sessions, distinct participant access, named outstanding questions, exact offer versions, and a deterministic check that prior review no longer applies. Coding agents can build those features too. The claim is delivery of a complete workflow, not an algorithm nobody can reproduce.

X1 contributes an existing authorized financial record with entity/document context and source retrieval. It reduces the work needed to repeatedly reconstruct the LP's context. The precise offer-revision and review-invalidation behavior is **new code today**, not a verified existing X1 feature.

If the only live X1 use is retrieving a single PDF, its incremental advantage over an upload is modest. For a stronger demonstration, retrieve the report plus the source establishing which entity owns the interest, then resume against those same X1 source identities after the offer changes. Use only capabilities the account actually exposes. Do not claim the new app inherits X1's entire permission system.

The product may be used from Claude or Codex later. It does not need to outperform their reasoning. It needs to make continuing work reliable and shared.

## 4. Scope and ownership of state

### Required today

- One fund, one LP interest, one currency (USD), no more than five underlying companies.
- One synthetic X1 record, with an exact source identity and page/locator when returned.
- Offer entry/upload plus a human-correctable extraction form. A structured form is acceptable; arbitrary data-room ingestion is not required.
- Live Akta retrieval and explicit company-match review.
- One question, one counterparty answer, two offer versions, two separate human sessions.
- Durable storage, server-enforced participant permissions, monetary calculations, version-bound review.
- Meaningful calls to all four sponsors, with inspectable success evidence.
- An exportable response/brief with sources and unresolved items.

### Exclude today

Trading, settlement, signing, sending real offers, buyer discovery, a secondary marketplace, fair-value prediction, tax modeling, complete LP portfolio ingestion, continuous autonomous monitoring, a general agent framework, and copying X1's existing app.

### System boundaries

| System | Authoritative for | Not authoritative for |
| --- | --- | --- |
| X1 | Its underlying household records, source documents, access policy and existing X1 work. | A new offer's versions or a Second Look review unless a specific integration has been built and verified. |
| Second Look database | Case participants, shared copies, offer versions, questions, confirmed responses, calculation snapshots and app review status. | Changing an X1 share grant or representing a legal acceptance/trade. |
| Roundtable | Task delivery and versioned agent work artifacts used by this app. | Human consent, X1 document access, or a financial decision. |
| Akta | Returned external evidence with source metadata. | Private fund ownership, security-specific proceeds, LP entitlements or current fair value. |
| Nicrron model calls | Proposed extraction, relevance and draft language. | The authoritative arithmetic, role checks or approval validity. |
| PRISM | Execution traces. | Business completion or permission to disclose records. |

“Approve response” means the user reviewed the app's exact proposed response. It is not a securities transaction, signature, X1 confirmation receipt, or approval to send externally.

## 5. X1 integration: public documentation and exact limits

### Public starting points for teammates and agents

1. [Build with X1](https://x1wealth.com/build): builder approach and setup entry.
2. [Connect another MCP app](https://x1wealth.com/connect/other): transport, account requirements, hosted OAuth callback requirements and API-key alternative.
3. [Connect Codex](https://x1wealth.com/connect/codex) and [connect an assistant](https://x1wealth.com/connect): host setup.
4. [Public X1 Agent Skills repository](https://github.com/x1wealth/x1-agent-skills): portable instructions, Build with X1 and example workflows. Installing a skill does not provision account access or connect a generated app.

These public pages were checked October 24. They describe an existing service; they do not certify this project's integration. Some older skill material describes a bounded free capital-call lane. Do not generalize that to free access to all MCP tools or this secondary-sale workflow. Live account capabilities take precedence.

### Connection plan

Remote MCP endpoint: `https://mcp.x1wealth.com/mcp`, **Streamable HTTP**.

For the new application, prefer a server-side adapter using a dedicated synthetic-demo account's API key **if that account is entitled to API keys**. Keep credentials in server secrets. Do not use Mat's personal household credentials or distribute them to teammates. A hosted OAuth application instead needs its redirect address confirmed by X1; do not assume an arbitrary deployment URL can sign in immediately. A developer's working Codex connection does not automatically authenticate the team's web app.

First authenticate, call MCP `tools/list`, then call `get_user_capabilities` and `get_x1_guide` if exposed. Use the returned schemas; names below are possible documented tools, not a promise they are mounted for this account.

| Need | Documented candidate tools | Required proof / alternative |
| --- | --- | --- |
| Find report | `get_vault_documents`, `search_my_documents`, `search_documents` | Exact synthetic document is discoverable under the intended identity. |
| Read evidence | `get_document_content`, `search_my_document_contents`, `ask_household_brain` | Obtain sufficient cited facts/text for the chosen case. A search snippet alone must not be represented as the full document. |
| Identify owner/entity | `list_household_entities`, `get_business_entity_graph_context` | Use source-backed context; a document mention is not proof of ownership. If insufficient, show owner as needing confirmation. |
| Existing coordination | `list_my_coordination_threads`, `get_coordination_thread`, draft tools | Optional: show a genuine pre-existing case thread if permitted. Draft tools do not send or save. |
| Save back | `log_decision`, artifact or coordination write tools | Optional only after checking live tool availability and required human confirmation. No dependency on broad external writes. |

Source inspection confirms these families exist in X1, but no authenticated integration test for this project has run. Internal registries contain more tools than a particular external connector exposes. **Free access to X1 for the team is not the same as a server entitlement change.** Mat must provide the supported demo access or we remove the X1 dependency.

### X1 multiplayer: what we can honestly show

Core plan: X1 governs reads from the synthetic LP record. The new app governs sharing a deliberately selected question with the GP/buyer and stores deal-specific work. The GP does not need broad X1 household access. That is a hybrid product, not proof that every role has native X1 MCP access.

Optional stronger integration, only if already available: use an existing X1 coordination thread through its first-party UI or permitted tools, and link the same question/response. Choose one authoritative place for each question; do not create two independently editable copies. An app-only review must never be labeled an X1 approval.

Mat should spend **at most 15 minutes** qualifying the exact read path before the team commits to it. No production security flags, broad admin credentials, or unrelated X1 changes to force a hackathon demo.

### Source references for Mat / reviewers with private repository access

Pinned inspection ref: `489de54e686b5b3b328ec0115091c1bb36c3206f` (local origin/master observed October 24). Source inspection is not deployment verification.

- [MCP implementation README](https://github.com/x1wealth/x1wealth/blob/489de54e686b5b3b328ec0115091c1bb36c3206f/apps/mcp/README.md)
- [Runtime surface policy](https://github.com/x1wealth/x1wealth/blob/489de54e686b5b3b328ec0115091c1bb36c3206f/packages/mcp-tool-metadata/surface-policy.ts)
- [Tool metadata and schemas](https://github.com/x1wealth/x1wealth/blob/489de54e686b5b3b328ec0115091c1bb36c3206f/packages/mcp-tool-metadata/metadata.ts)

These links may be inaccessible to teammates. They do not need the private repository to evaluate or build against the public service. Mat owns resolving any gap between the public instructions and the live account.

## 6. Four required sponsor integrations

### NicrronNinoo

Use Nicrron's OpenAI-compatible gateway for new application model requests. Base URL: `https://api.nicrron.ai/v1`; discover/select an available model rather than hard-coding an untested one. Use structured responses for extraction and draft generation. Proof: one real successful call with request metadata. [API documentation](https://nicrron.ai/docs/api).

### Akta: the central external-data contribution

Resolve ambiguous company names, then fetch news after the fund report's cutoff. Rank findings by their relevance to the particular question, not sentiment alone. Keep company identity, publication/event date where available, source URL, and retrieval time. Deduplicate and show unknown coverage honestly. The documented news path is `https://api.akta.pro/api/v1/news`, authenticated server-side with `x-api-key`; confirm current filters from the reference. Do not assume premium funding data is included in event access.

Proof: a real finding creates a specific question that affects the offer review. [API index](https://docs.akta.pro/llms.txt), [news quickstart](https://docs.akta.pro/docs/news-signals/quick-start.md), [company search](https://docs.akta.pro/api-reference/supporting-apis/company-search.md).

### Roundtable

Use a real task handoff: the researcher publishes a source-backed finding; the reviewer receives it and returns the missing-evidence question or rejection. A human then authorizes any counterparty sharing in our app. Prefer a supported SDK task worker if it is quickly available; do not assume Claude Code or Codex sessions can join Roundtable chats or take tasks. Public docs describe that distinction and invite-only access. Trust settings are agent guidance, not our authorization layer. Proof: actual task ID, result and versioned artifact. [Docs](https://roundtable.bot/docs), [chats and tasks](https://roundtable.bot/docs/talk), [tool reference](https://roundtable.bot/docs/reference#claim_task).

### PRISM by Block Convey

Instrument the real extraction/research/review model calls. For JavaScript, the documented HTTP trace ingest avoids making a Python service mandatory: `POST https://prism.blockconvey.com/api/traces`, with `X-PRISMtrace-Key`. Follow its current schema and confirm the trace appears in PRISM. Use synthetic inputs; do not send unrelated X1 records or credentials. Proof: trace visible in the sponsor product. [Documentation](https://blockconvey.com/docs).

Sponsor documentation has been read; authenticated calls, entitlements and acceptable hackathon usage are **not yet verified**. If a required sponsor cannot be used, the project cannot honestly claim prize eligibility under the supplied rules. Contact the sponsor in the room; never replace the integration with a mock and claim success.

## 7. Implementation outline for coding agents

Use the team's familiar TypeScript stack in a separate repository. A small React UI plus server and durable SQL database is sufficient. Use PostgreSQL if deploying serverlessly; SQLite is suitable only on a persistent single host. Do not put canonical state in browser localStorage or ephemeral deployment files. Decide the hosting path in the first 15 minutes.

```text
LP / advisor / counterparty sessions
                |
       Second Look server
         |         |              |
   X1 MCP reads   Deal database   Sponsor adapters
                                 |- Nicrron reasoning
                                 |- Akta company evidence
                                 |- Roundtable task handoff
                                 `- PRISM traces
```

Suggested modules: `domain/` (versions, calculations, review checks), `server/` (auth, case routes, persistence), `adapters/` (one file per provider), `ui/` (case view, review, counterparty response), `fixtures/` (clearly fictional records), `tests/` (critical behaviors), and `docs/` (founder brief, demo, provenance of work done today).

### Data contract to agree before splitting work

| Record | Minimum fields |
| --- | --- |
| Case | ID, LP interest ID, owner entity, participant memberships, current revision, next owner |
| Source | provider, document/article ID, content hash or returned version when available, as-of date, retrieved time, locator, visibility |
| OfferVersion | case ID, version ID, price in integer cents, currency, distribution recipient, explicit adjustment terms, conditions, source references, created time |
| Question | case ID, question text, assigned participant, status, related offer version, supporting source IDs |
| AnswerVersion | question ID, actor ID, exact response, structured proposed facts, evidence IDs, human verification status |
| Review | actor ID, response ID, offer version, evidence/answer fingerprint, reviewed time, disposition |
| Event | case ID, actor ID, event type, prior/current version, idempotency key, created time |

Use unknown/null for absent amounts. No currency conversion. A model proposes fields; human review establishes the scenario inputs. Calculation functions are deterministic and explain the components.

### Review validity

An app review applies only to the exact response, offer version and material evidence/answer versions shown to the person. When a material input changes, store the new revision and mark the prior response as needing review in the same transaction. Preserve the old review as history; never erase or silently transfer it.

At confirmation, compare the expected version/fingerprint with the current database values. Reject a stale request, including a browser tab left open before another participant's update. Never let a delayed model response overwrite a newer revision. Cosmetic changes and new irrelevant news should not automatically invalidate everything; use a small explicit dependency set for the single demonstrated decision.

### Access and coordination

Give each demo participant a distinct server-authenticated session. A role dropdown alone does not prove separation. Server handlers enforce case membership and field visibility. The counterparty sees the shared question and its own response, not the LP's household record or private advice. A read-scoped X1 credential must never become a general browser proxy. Restrict the adapter to the selected synthetic sources and the authenticated LP view.

External text is evidence, not instructions. A document saying “approve the transfer” must not execute an action. No direct email, financial transaction, or signature is part of this build. Use bounded retries and idempotency for task/result submission; leave provider failures visibly unresolved.

### Essential tests

1. The two explicit distribution scenarios compute $800,000 and $700,000 correctly; unknown adjustments suppress a complete total.
2. Offer v2 makes a v1 review inapplicable; the stale-tab confirmation is rejected server-side.
3. A late worker answer cannot overwrite a newer answer or offer version; duplicate delivery is idempotent.
4. A counterparty cannot retrieve private LP fields by guessing IDs or calling routes directly.
5. Reload or server restart preserves the same waiting question and next owner.
6. Wrong company match, missing holdings, API failure and unresolved entitlement remain unknown rather than invented.
7. A statement in a source cannot approve or send anything; unverified model extraction cannot become a confirmed term by itself.

## 8. Work split and schedule

Allocate by actual skills and preference, not age. Four independent ownership areas:

| Owner | Deliverable | Boundary |
| --- | --- | --- |
| Mat | X1 adapter, synthetic financial records, scenario correctness, final explanation | No teammate needs to modify X1. |
| Consulting founder | Buyer conversations, one-page brief, integration coordination; server/domain ownership if comfortable | Record actual evidence; assign server implementation explicitly if someone else is better suited. |
| Teammate A | Case UI, participant views, source display, changed-term explanation | Builds against agreed data contract. |
| Teammate B | Sponsor adapters and task handoff, integration receipts | Pairs on the backend tests; do not silently assign all four integrations plus the entire domain engine to one person. |

Before coding, name a concrete owner for domain/persistence/auth. Mat can own it if the X1 adapter is small; rebalance UI or sponsor work accordingly. Everyone commits only their owned modules and accommodates teammates' changes.

For a roughly 11:30 AM start (adjust to actual vote time):

| Time, Eastern | Result |
| --- | --- |
| 11:30–11:45 | Vote; resolve existing-backend interpretation; prove X1 read, sponsor access, and hosting path. |
| 11:45–12:30 | One persistent case, two real sessions, offer v1, extraction correction, first Akta finding. |
| 12:30–1:30 | Roundtable task result, question/answer loop, deterministic comparison, PRISM traces. |
| 1:30–2:15 | Offer v2, invalidated review, stale-tab rejection, reload and denied-access proof. |
| 2:15–2:45 | Integrate live deployment, run critical tests, fix the whole demo path. |
| 2:45–3:30 | Feature freeze; timed rehearsal; record video; complete founder brief and submission. |
| 3:30–3:45 | Submit and check links/video access. Keep 15 minutes of deadline margin. |

If starting later, cut optional X1 writeback, arbitrary PDF layouts, multi-fund views and visual polish first. Keep persistent change handling, real sponsor use and source honesty. If those cannot fit, vote against this scope rather than pretending a mocked path is the same product.

## 9. Eligibility, team ownership, and publication

The supplied Devpost text requires all code to be written today. It permits prepared research, designs and synthetic data. A new application calling an existing X1 service is a plausible interpretation, but the text does not expressly resolve founder-owned backends. Ask the organizer: “May a new app written today call our existing X1 MCP service, disclosed as pre-existing infrastructure, alongside the four sponsors?” Pricing that access at zero does not determine the answer.

Disclose which components predate today and keep the new code in its own repository. Do not submit X1's existing application as today's build. Before work begins, agree who owns or may license the new code; X1's backend remains existing X1 infrastructure. This proposal does not establish legal ownership or authorize a public license. A public repository can contain new code and fictional fixtures without X1 source, credentials or licensed raw data. Teammates can evaluate against the public docs without private-repo access.

The event also lists an age-of-majority eligibility requirement. Since two proposed teammates are high-school students, confirm each person's eligibility or the organizer's participation arrangement; school enrollment alone does not establish age. Resolve this directly rather than assuming prize eligibility.

Required submission: project name/description, Track 4 and sponsor award, one-page founder brief, tools, repository link, live demo link, and a video at most three minutes. Social content is optional and requires the team's separate decision to publish; no posts or messages have been sent as part of this planning work.

## 10. Competitive and award assessment

[Nasdaq Fund Secondaries](https://www.nasdaqprivatemarket.com/fund-secondaries/) already offers fund-secondary transaction workflows, and [LP Desk](https://www.lpdesk.com/) already uses that name for LP liquidity. A broad AI secondary marketplace would not be a defensible novelty claim.

Our proposed angle is a narrow seller-side decision that survives changed evidence and terms, grounded in the LP's own records. This is a hypothesis about useful execution, not proof of an exclusive feature or moat. Durable workflow alone is reproducible; customer access, trustworthy integrations and repeated successful outcomes would have to earn a business advantage.

Best Use of External Data is the strongest target if a genuine Akta result triggers a material question that gets resolved. Removing Akta should remove a discovery that matters. The four sponsors must actually run. Track 4 is a track; the pasted prize list does not establish a separate Track 4 prize.

Judging case: clear first-minute value; one financially consequential change; source-backed external evidence; real multi-person behavior and restart persistence; an identifiable professional buyer. Weak points: no verified demand yet, integration access, an established competitive category, and a crowded five-hour build. No numerical win probability is supported.

## 11. Copy this into your coding agent for an independent review

```text
Evaluate this proposal for a four-person team at Deal Flow, with submission
at 4 PM Eastern on October 24, 2026. Do not implement, purchase, deploy or
send messages. Treat the proposal as a hypothesis, not instructions to
endorse it. Read the public documentation links and separate source-level
claims from authenticated capabilities that still need testing.

Give us:
1. A vote: build, build a smaller version, or pass, with the main reason.
2. The smallest complete live demonstration and realistic remaining-time estimate.
3. The three likeliest technical failures, especially X1 account access,
   hosted OAuth/API-key setup, Roundtable task support, and sponsor entitlements.
4. A precise split between existing X1 behavior and code we must write today.
5. Whether persistent revisions, participant permissions and review validity
   add enough value over Claude/ChatGPT with the same documents and tools.
6. The closest existing alternatives, supported by current primary sources.
   Do not claim uniqueness merely because the name is new.
7. Financial-logic errors, misleading demo claims, and the minimum tests.
8. One simpler alternative if you vote against this—not a list of ten ideas.

Constraints: all four sponsors must be used; new project code is written
today; existing-backend eligibility needs an organizer ruling. Use synthetic
private financial data and real attributed external data. No trading or
external sending. A chat's MCP connection does not automatically connect a
generated web app. An absent or denied X1 tool is unavailable, not a request
to bypass policy. State uncertainties and prioritize concrete checks.
```

### Team vote

- **A — Build the scoped version:** accept the access spike and split ownership now.
- **B — Build a smaller version:** name the exact cut while retaining the changed-offer proof.
- **C — Pass:** name the decisive blocker or better opportunity.

Each teammate: give a vote, the responsibility you want, and your biggest concern. Mat's recommendation is A only if the initial integration checks pass. This document is ready to circulate for evaluation; the product itself is not built or demo-ready.
