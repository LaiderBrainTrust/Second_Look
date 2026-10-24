# Enable the dedicated X1 connection on Railway

The app code, dedicated synthetic X1 account, read-only key, and two fictional source PDFs are ready. This requires two runtime variables on the existing Second Look service; no new account, database, domain or infrastructure is needed.

Forwardable message:

> Stratten — can you add two variables to the **production Railway service serving secondlook.ac**?
>
> 1. Open the service → **Variables**.
> 2. Add `X1_API_KEY` using the value in the privately supplied `x1-railway.env` file.
> 3. Add `X1_CASE_ID` with value `sample-fund`.
> 4. Leave the other variables intact. Review the staged changes and click **Deploy** so the running app receives them.
> 5. Tell Mat when the deployment is healthy. We'll verify the connected search/import on the public site.
>
> The key is read-only and belongs to a separate synthetic X1 account with two fictional PDFs. It is not Mat's household key. It stays server-side; do not prefix it with `VITE_` or add the file to GitHub.

The private file is outside version control at `.local/x1-railway.env` on Mat's checkout. This document intentionally contains no key. Repository Codespaces secrets also contain the same `X1_API_KEY` and `X1_CASE_ID`; Actions secrets cannot be downloaded. Repository secrets do not automatically become Railway variables.

After deployment, sign into the example as the investor, open its comparison/funding section, expand **Use evidence from X1**, and search **capital**. Expect the synthetic capital-call PDF with page 1. Previewing does not change the case; copying the excerpt does advance its revision and makes earlier reviews historical.

Railway reference: [variables and staged deployment](https://docs.railway.com/variables).
