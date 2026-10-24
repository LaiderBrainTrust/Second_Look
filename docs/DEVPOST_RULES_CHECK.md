# Devpost requirements check — October 24, 2026

Checked the event's Overview, Rules, Resources, Updates and Discussions in Chrome on October 24, approximately 12:50–1:00 PM Eastern. Read the live sponsor guide linked by Resources through the Drive connector. This is a source comparison, not an organizer ruling.

## Findings that affect today's plan

| Source | Finding | Decision / unresolved point |
| --- | --- | --- |
| [Overview](https://nyc-vc-hack.devpost.com/) | A working product, useful to a fund, clear in the first minute; end-to-end behavior on realistic data; all four named sponsors required | Keep the real backend and let Ryan build the customer experience. A UI mock or sponsor-status dashboard is not the submission goal. |
| [Rules](https://nyc-vc-hack.devpost.com/rules) | Event-written code; public APIs, open-source libraries and starter templates allowed; AI coding assistants allowed | Reusing public services is explicitly permitted. This does not grant permission to relabel a pre-built private app as event-written code. X1 remains an optional unused service, not a dependency. |
| [Resources](https://nyc-vc-hack.devpost.com/resources) | Describes Nicrron API, Ninoo Builder and Ninoo Code under one account; links the same sponsor guide supplied earlier | The guide is officially linked by the event. Do not dismiss it as an unrelated PDF or claim API-only eligibility is settled. |
| [Live sponsor guide](https://docs.google.com/document/d/1x2gTHi39wIUNlUZefGzugnYop7oLPNG4/edit) | Qualification section requires Ninoo Builder, a Marketplace listing and Nicrron-routed AI; later sections offer Builder, API and Code paths | Still contradictory. The signup choice concerns a shared account; it is not an explicit waiver of the qualification section. Get organizer clarification, or fulfill the stricter instructions and verify the result. |
| [Updates](https://nyc-vc-hack.devpost.com/updates) | No announcements displayed | No posted clarification found at observation time. |
| [Discussions](https://nyc-vc-hack.devpost.com/forum_topics) | No discussion topics displayed | No posted clarification found at observation time. |

## Recommendation and exact clarification

Keep the functioning Nicrron API integration and current public backend. Ryan's design work can proceed against the existing APIs. Do not claim confirmed eligibility from API use alone: the officially linked guide expressly adds Builder and Marketplace requirements.

Ask the organizer/sponsor in the room:

> For overall Deal Flow prize eligibility, does our working Nicrron API integration satisfy “NicrronNinoo,” or must we also use Ninoo Builder and publish a Marketplace listing? Resources links a guide that requires both but also lists a standalone API path. If Builder is required, does importing today's app and retaining its external backend qualify?

No new permission to ask Mat for is implied. The outstanding facts are the organizer's interpretation and, if needed, Builder account authentication. Mat previously authorized import/listing work. The optional bridge and listing draft are already merged in PR #5; no Ninoo import/publication is complete. Do not migrate the persistent Node/SQLite backend merely to host a frontend.

## Other concrete event constraints

- **Deadline:** Overview and the Rules dates section say 4:00 PM Eastern; a later Rules bullet says 4:30 PM. Treat **4:00 PM Eastern as the hard stop**, submit by 3:30 PM, and verify links/access before then. Do not use the later sentence to assume extra time.
- **Team:** Rules specify 2–4 members. Mat's latest description is four people. Confirm the submitted team matches this; earlier suggestions for five-person teams are not the current published limit.
- **Age:** Overview's eligibility widget says participants must be above the legal age of majority; Rules welcome students. Since the team includes high-school students, confirm actual eligibility with organizers without assuming their ages or an exemption. Do not displace Ryan or reassign his work based on the ambiguous text.
- **Data:** Rules require public/synthetic inputs and prohibit uploading confidential data without permission. Keep the current fictional fund/offer and honestly dated public evidence.
- **Submission:** Overview asks for a project description/track, founder brief, sponsor/tool list, repository, live link and a video of at most three minutes. API checks are not a substitute for those deliverables.
- **Awards:** Overview describes the Akta external-data award, but the prize table lists cash only for the overall and content prizes. Do not invent a separate Akta cash amount.
- **PRISM:** Resources separately describes a challenge involving editor MCP access, repeated runs on fixed inputs, a rule added through MCP, and a v1/v2 comparison. Existing trace receipts establish API use, not completion of that separate challenge. Do not spend the remaining time generating runs just to inflate a number. Add that challenge only if the team deliberately chooses it after the core product and submission are ready.

## Evidence boundaries

Live browser observation is of the published event pages, not a private organizer response. The linked guide was returned as `NicrronNinoo-Betaworks-VC-Hack-GTM.docx`, modified October 23, 2026. The qualification requirements remain present in that live file. No messages were sent to organizers and no accounts, billing, credits or submissions were changed during this check.
