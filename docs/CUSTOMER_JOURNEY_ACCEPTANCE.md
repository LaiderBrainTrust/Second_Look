# Customer journey — hosted acceptance, October 24

Release: `d15732f0d0a6dc40f8f8b259944097429829fd4e` on https://secondlook.ac, from PR 23. This is a browser acceptance record using explicitly synthetic financial inputs, not customer validation.

## What changed

The customer now signs in with their own account, sees their cases, and follows **The deal → The evidence → The conversation → Your decision**. The presentation example is a separate sign-in choice and labels its fictional fund/terms. Optional offer comparisons and funding analysis are secondary to the actual sale.

## Verified on the public site

- Individual account sign-in reached the case list. Creating a case used entered terms and selected that case.
- The investor created a one-use manager invitation in the app.
- A second browser opened the invitation, registered a separate account, and reached the same case with its assigned manager role. It had no presenter role switcher.
- The manager entered and saved a $125,000 distribution answer. The investor loaded the saved update.
- A $735,000 payment, explicit zero adjustment, and seller-retained $125,000 distribution produced $860,000 gross proceeds.
- The investor recorded a review. Reload retained the review and the selected case. The dedicated HTML decision record downloaded.
- Keyboard skip navigation retained the case URL and focused the main workspace.
- The selected account case showed the X1 connection and explicit external-research consent controls.

## Sponsor workflow through the new customer UI

In the same synthetic account case, external research was explicitly enabled. The UI searched Microsoft with Akta and returned ten dated news findings. Selecting a finding and requesting a draft created research run `ea37e991-1d82-4369-9abe-eab3412bbf07` and Roundtable task `ab50625aecec41189d5b44e805bcc878`. The completed result reported method `nicrron` and PRISM trace `d3eda405-6b77-410d-b4cb-4aa6ddee5faf`, status `recorded`.

The investor shared that proposed question through the UI, which moved to The conversation and required a fresh manager answer. The separate manager account refreshed and answered. The investor refreshed, recorded the current review, reloaded and downloaded the dedicated record again; gross proceeds remained $860,000. No real fund ownership, investment conclusion or external message was asserted.

## Other acceptance

Local browser checks exercised a changed buyer payment of $720,000 and a negative $2,000 adjustment; with the $125,000 distribution the result was $843,000. A changed offer made prior reviews historical. Desktop and 390px-wide screens were inspected with no horizontal overflow. Screenshots and exact source binding are in `docs/screenshots/customer-journey-receipt.json`.

All 87 automated tests across 24 files passed, including the expanded hosted command permissions test; the production build passed. Independent source/visual review found three navigation defects, which were corrected and re-reviewed: keyboard skip routing, invitations opened from presenter sessions, and stale question drafts after explicit refresh.

Separately, a real presenter session survived a deployment from `502515d2794b2aae8e371c720f431b4bb3e87da9` to `94a028068e39e128a10364e581532d75af1f766f`, retaining its role. Logout invalidated it.

## Presenter handoff

1. Open https://secondlook.ac and choose **Team example** for the fictional gaming demonstration, or use an individual account for your own entered case.
2. Start with **The deal** to explain the sale and distribution rights.
3. Open **The evidence** to inspect games/company signals and prepare the missing manager question.
4. Open **The conversation** to show the question and answer. Presenter controls can simulate the manager/buyer only inside the labeled example; real cases use separate invitations/accounts.
5. Open **Your decision** to review the current sale. A later change makes that review historical.

Run this aloud on Ryan’s actual laptop before calling the presentation ready. This acceptance did not include that timed rehearsal. Existing research is dated and saved; do not describe it as freshly fetched unless the new request completed.

## Remaining boundaries

No automatic email delivery or deadline chasing; invitations are copied and shared manually. No self-service account recovery/MFA, general uploaded-document parsing, confidential-client acceptance, or verified Railway restore drill. Comparisons do not automatically become the actual sale. Records do not execute transactions. See `CUSTOMER_READINESS.md` for the original audit and remaining operations work.
