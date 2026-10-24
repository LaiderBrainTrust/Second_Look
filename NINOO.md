# Second Look: Ninoo integration lane

This project is being imported for Deal Flow, October 24, 2026.

**Ryan owns visual design. Do not restyle, redesign or replace the React screens.**
The working Node backend and its SQLite database remain hosted externally.
Do not convert the business logic to Python or create a new database.

## Publish architecture

- Build the existing Vite/React frontend with `npm ci` and `npm run build`.
- Publish `api/main.py` as the Ninoo Python backend, with `api/requirements.txt`.
- That backend is a narrow same-origin proxy to the already deployed Node API.
  It keeps browser session cookies on the Ninoo hostname and forwards only the
  application's session cookie. No sponsor credentials belong in Ninoo or VITE variables.
- Do not use Vite's development proxy as the published backend.
- The Node service owns authentication, the case, money arithmetic, approvals,
  saved history, Roundtable review tasks and all sponsor calls.
- The existing Node API is at https://x1cloud.tail6fbca0.ts.net. This is a public
  HTTPS Funnel endpoint; no Tailscale membership is needed.
- If the platform does not preserve the published request Host in Python,
  set `NINOO_APP_ORIGIN` to the exact published HTTPS origin. Never relax the
  same-origin checks to a wildcard.

## Verify before publishing/listing

1. `npm test` and `npm run build`.
2. Python bridge tests: `python -m unittest api.test_bridge` with FastAPI/httpx installed.
3. The published `/api/health` must reach the real Node service.
4. `/api/case` without login returns 401. Cross-origin POST returns 403.
5. Sign in using the privately supplied team presentation code; never put it
   in a listing, prompt, source code, or public preview configuration.
6. Show the existing saved gaming evidence and question. Do not change the
   shared presentation case while Ryan is rehearsing without coordinating.

For the listing use docs/NINOO_MARKETPLACE.md. Do not claim investment returns,
real client use, verified counterparty identities, or guaranteed prize eligibility.
Listing is subject to Ninoo human review. Keep remix disabled unless the team
explicitly chooses to offer its code for remixing.
