# Downloadable decision record

Owner: Mat/Codex backend; Ryan owns the download button and its placement.

## API

`GET /api/case/decision-record?revision=3&format=html`

- Investor-only. Hosted mode uses the existing secure session; counterparty roles receive 403 even with a forged investor header. Local development uses `x-demo-role: lp`.
- `format=html` (default): standalone readable HTML with embedded print styling, no scripts, no external resources. Download, open in a browser, print/save as PDF, or forward the file deliberately.
- `format=json`: structured record with `schemaVersion: 1`, export time, disclosures, current case and explicitly current/historical approvals. Amounts remain integer cents; unknown values remain null.
- Include the displayed `revision`. A changed case returns 409; refresh the screen and let the investor choose again. Omitting revision explicitly requests the latest state.
- Both formats return an attachment and `Cache-Control: no-store`. Export reads the saved state without changing it or calling sponsors.

## Ryan's integration

Add “Download decision record” where it fits the investor's review/history view. This is a real export, not a screenshot of the app. Only show it to the investor. Example using the same-origin hosted session and local-role compatibility:

```ts
async function downloadDecisionRecord(revision: number, format: 'html' | 'json' = 'html') {
  const response = await fetch(`/api/case/decision-record?revision=${revision}&format=${format}`, {
    headers: { 'x-demo-role': 'lp' }, // ignored in hosted mode; server session owns role
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error ?? 'Could not download the decision record.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `second-look-decision-r${revision}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
```

Show errors next to the action. Handle 401 with sign-in and 409 with a visible refresh action; do not silently retry against a new revision. The export contains investor-private information, so forwarding is the investor's deliberate action. The app does not send it automatically.

## Contents and boundaries

Current offer/price adjustment/distribution recipient; scenario gross receipts; selected game/studio when saved; question and its source; manager answer and source; last recorded offer change with its revision; original approval text/answer/timestamp; change history. Old approval fields that were not saved are labeled missing, never filled with current data. The last offer-change delta is explicitly historical if a later answer changes the economics.

All fund/offer/participant data remains labeled illustrative. Current records simulate participant roles, not independently verified identities. This is a portable decision record, not a certified audit log, signature or proof of a transaction. Export time is distinct from approval time. Later changes are not reflected in an already downloaded file.
