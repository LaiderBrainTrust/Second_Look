# Sponsor setup — October 24, 2026

## Akta: live server integration

`AKTA_API_KEY` is saved as a repository **GitHub Actions secret** in `stratten/vc_hackathon`. It is also installed in the ignored, owner-only `.env.local` on Mat's build machine. No key is committed.

GitHub secrets cannot be downloaded by teammates. The workflow can consume the secret; a local developer needs their own `.env.local` containing the team-provided key. The hosting platform will need its own server-side `AKTA_API_KEY` setting. Do not use a `VITE_` variable for it.

```sh
cp .env.example .env.local  # only if you do not already have .env.local
# Set AKTA_API_KEY in your editor, then:
npm run dev
npm run smoke:akta
```

The API and smoke script load `.env.local` automatically. Existing exported environment variables take precedence. Restart the API after changing the key.

The manual **Akta live smoke check** Actions workflow runs company search and one bounded news request using `${{ secrets.AKTA_API_KEY }}` and uploads only a small receipt with counts and source URLs. Once the workflow is on the default branch, anyone with appropriate repository access can run it from Actions. Each run consumes the provider's ordinary API credits; it is deliberately not triggered on every push.

### App routes

Send JSON POSTs to the local API (port 3001) or through Vite's `/api` proxy:

| Path | Body | Result |
| --- | --- | --- |
| `/api/research/search` | `{"query":"anthropic.com"}` | Company candidates with UUID, name and website |
| `/api/research/discover` | `{"query":"Healthcare SaaS companies in Europe that raised funding in 2025","limit":3}` | Candidates, interpreted filters, warnings and skipped sections |
| `/api/research/enrichment` | `{"companyId":"0000002"}` | Firmographic and management profile |
| `/api/research/news` | `{"companyId":"0000002","after":"2026-09-30"}` | Dated headlines and source URLs matching the selected company |

Use the user's selected UUID. The convenience `findSubsequentEvents` adapter refuses ambiguous identity matches; it never blindly chooses the first search hit. News retains explicit matching company mentions, excludes articles on/before the report cutoff day and future dates, rejects unsafe source URLs and removes duplicate URLs. It examines only the first ten returned articles, so this is not exhaustive coverage. Provider dates are retained as supplied; the filter compares calendar dates.

The actual user-supplied company ID resolves to **Anthropic**. It is a connectivity example, not a holding in the fictional fund. Discovery results are candidates: a successful request does not prove every returned company matches the requested financing, geography or date criteria. Company mentions are not materiality judgments or fund valuations. No research request changes or approves the case.

Keys go only in the server's request header to the fixed Akta origin; redirects are refused. Provider error bodies are not exposed to clients. Routes are local-only scaffold routes, not ready for a public production API; authenticated access and rate limits belong in the deployment work.

### Observed verification

Company search, discovery, enrichment and news each returned HTTP 200 on the build machine. The adapter smoke check returned ten source-linked news findings. A live call through `/api/research/search` returned Anthropic and changed the running API's Akta status to verified. Safe machine-local receipts are in ignored `.local/akta-*-probe.json` and `.local/akta-smoke.json`; full provider responses are not published.

## Roundtable: build machine connected

Installed the user-requested `@roundtable/cli` **0.2.19** from its GitHub release. Browser authorization succeeded for **x1cloud-vc-hackathon**. This headless machine has no desktop secret service, so the CLI uses its supported private-file credential storage. `roundtable setup` installed its user service; `roundtable service start` started it. `roundtable status --json` reported `service_connection: online`.

Setup uses default metadata monitoring: **no project conversation-content roots and no remote-control grant**. No Roundtable credential is copied into the app or GitHub. Installation and a connected machine do not implement the app's task/review adapter and do not by themselves establish sponsor eligibility. The event instructions supplied by Mat point to a shared research workflow with tasks and versioned files; use that as the product integration target below.

Teammates connect their own machines with:

```sh
roundtable_package="https://github.com/roundtable-bot/roundtable-cli/releases/download/v0.2.19/roundtable-cli-0.2.19.tgz"
npm install -g --allow-remote=root --allow-scripts="$roundtable_package" "$roundtable_package"
roundtable login
roundtable setup
```

### Product workflow: separate workspace credentials required

The SDK guide distinguishes machine login from a **team key**, which is the key of an AI assistant connection. In the Roundtable workspace, use **Agents → Connect agent → AI assistant → Custom** and name the connection for the team. Its setup key can provision the individual bot keys. Event access uses code `VCHACK` on the signup waitlist screen. The machine login above cannot substitute for this team key.

The upstream Funds template has been inspected. It creates two identities, `fund-reader` and `quarter-brief`; dispatches a task per fictional fund; reads reports/notices; and saves a version-cited quarter brief. Its deterministic parser expects the supplied semi-structured documents. It does not already read arbitrary PDFs, fetch Akta news, or call a model. `askModel()` is the explicit model integration point.

Once the workspace key is available, initialize in a separate directory to preserve the app:

```sh
roundtable init .local/roundtable-funds --template funds
# Paste the workspace team key only at the hidden prompt.
cd .local/roundtable-funds
npm install
npm run dev
# In a second terminal, in that same directory:
npm run brief
```

The CLI writes separate bot credentials to that directory's ignored `.env`. Do not use `--force` against the app root. The SDK is distributed as a release tarball, not a registry package:
`https://github.com/roundtable-bot/roundtable-cli/releases/download/sdk-v0.1.1/roundtable-sdk-0.1.1.tgz`.

For Second Look, adapt this handoff rather than adding a separate product: save the selected Akta findings with case ID and revision; dispatch review work to the fund-reader; save its answer to a task-specific path; return the exact input/output file versions. Use Nicrron for any model call and PRISM for its trace. Results are research proposals and cannot approve the LP response. A result for an older case revision remains historical. The product is only integrated after a live dispatch, result, and versioned file have been verified. This step is currently pending the workspace team key; no bot was provisioned and no task was dispatched by this setup.

SDK retries handle backoff. Do not run a tight polling loop, overwrite a shared `latest.md` without a version check, or assume a timed-out task was cancelled: the SDK guide says it remains available to a worker. Prefer unique task paths and resume the existing task ID.

## Remaining sponsor/product work

- Hook the real Akta research response into the case question and UI.
- Implement NicrronNinoo model calls and PRISM traces with the team's credentials.
- Demonstrate the intended Roundtable use; the app adapter remains unimplemented.
- Connect X1 separately if retained in the team's final scope.

Provider references: [Akta documentation](https://docs.akta.pro/llms.txt), [Roundtable CLI](https://github.com/roundtable-bot/roundtable-cli), [SDK guide](https://roundtable.bot/docs/bots), [Funds template](https://github.com/roundtable-bot/roundtable-cli/tree/main/templates/funds).
