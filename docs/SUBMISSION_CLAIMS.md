# Submission claim corrections — October 24, 2026

Use [FOUNDER_BRIEF.md](FOUNDER_BRIEF.md) for the updated team brief. This note records the evidence and what still needs human input; it does not submit anything to Devpost or alter the shared Google document.

## Source of the correction

Mat relayed a review of the newer brief. The matching text is in the shared [Hackathon document](https://docs.google.com/document/d/18Rg5n3QnTz7G9EECPIfpI8PH3WZxNb09DKYnkCyHdqg/edit), including its “Second Look: Founder Brief” and “Second Look: Market Sizing” sections. Read October 24. Its table labels 87% pricing H1 2026, while the suggested pitch combines that with 2025 volume as “last year.” It also retains interview/pricing/pilot placeholders and an old 26-test/local-only implementation snapshot.

## Market periods: primary-source replacement

The [Jefferies 2025 review, published February 10, 2026](https://www.jefferies.com/insights/leadership-spotlight/2025-global-secondary-market-review-another-record-breaking-year/), independently supports:

| Claim | Exact period and meaning |
| --- | --- |
| $125B LP-led secondary volume | Calendar 2025 transaction volume |
| 87% of NAV average LP portfolio pricing | Jefferies says pricing **finished 2025** at this level |

The period mismatch in the draft is real, but 87% is not exclusively an H1 2026 statistic. Correct both labels to the cited 2025 source if using both figures. Do not call it 87 cents per dollar invested; NAV is the denominator. Neither figure describes every gaming/venture fund or predicts a particular stake's price.

Preferred short market sentence: **“Jefferies reports $125 billion of LP-led secondary transactions in 2025. We are testing a software workflow for the teams reviewing those offers.”** The brief uses this narrower claim.

Omit the suggested $1.4B “one point” aggregate opportunity and the $10M–$25M reachable software market from the submission. The draft has not established matching weighting/measurement bases, reachable buyer counts, purchase frequency or pricing. Assumption-based sensitivity calculations are not verified TAM or willingness to pay. Likewise, unverified advisor fee ranges and vendor price estimates do not establish what customers will spend. No revenue or alpha claim follows from transaction volume.

## Remove placeholders without inventing evidence

- Interviews: say verified counts/quotes have not been supplied for this brief. This does not assert that teammates held no conversations. Add only actual notes with role, date and permission before changing the claim.
- Pricing: retain $500/team/month only as the earlier unvalidated hypothesis; no claim of accepted pricing.
- Pilots and first ten customers: describe the proposed recruitment method; claim no named commitments without evidence.
- Competition: remove categorical claims that all monitoring or AI-diligence competitors lack approval/version records. The repo's competitive review identifies overlapping products; the narrow workflow advantage is a hypothesis.

## Current implementation boundary

| Capability | Evidence and allowed wording |
| --- | --- |
| Public hosting | secondlook.ac returned release `edb75814dc7934db607f3540327fc02ae8646d51` during this review. It is not local-only. Health proves deployed code, not the complete signed-in journey. |
| App authentication | Account/password/session, invitations and case-role APIs implemented and tested. An earlier isolated authenticated domain check passed. The current main screen is the synthetic presenter path; Ryan's customer account/case-picker UI is still pending. Do not call this complete production authentication/onboarding. |
| X1 import | PR14 verified actual source search, cited preview and selected import against a dedicated synthetic X1 account. Real integration; fictional records. |
| Individual X1 connection | PR15 verified encrypted owner/case-bound read-only keys plus connect/search/import/disconnect in an isolated signed-in browser shell using the actual component and app routes. No hosted customer OAuth flow. |
| Domain X1 activation | Stratten must set the private Railway variables and the resulting authenticated flow must be checked. A source merge or health response does not prove these settings are present. |
| Financial outcome | Fictional $100,000 scenario difference; no verified customer savings or investment alpha. |
| Readiness | Latest implementation: 76 passing tests and successful build. Ryan still needs a complete timed rehearsal on the presentation machine. Isolated checks are not that rehearsal. |

Implementation references: [PR13](https://github.com/LaiderBrainTrust/Second_Look/pull/13), [PR14](https://github.com/LaiderBrainTrust/Second_Look/pull/14), [PR15](https://github.com/LaiderBrainTrust/Second_Look/pull/15), [X1 contract](X1_CONTEXT.md), [individual account API](REAL_CASE_API.md), [Railway X1 setup](STRATTEN_X1_SETUP.md).

Keep the main pitch on what Ryan can actually show end to end. Mention separately verified capabilities as such. Do not present an unconfigured live X1 beat, incomplete account UI, sponsor approval, or customer pilot as finished.
