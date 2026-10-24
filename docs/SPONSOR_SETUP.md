# Sponsor setup — October 24, 2026

**New sponsor-guide caveat:** the supplied Nicrron/Ninoo PDF requires Builder use and a Marketplace listing, in addition to API routing. Its applicability to the whole Deal Flow event and acceptance of imported projects are not yet confirmed. See [Nicrron/Ninoo setup](NICRRON_NINOO_SETUP.md). API use alone must not be claimed sufficient.

## Akta: live server integration

`AKTA_API_KEY` is saved as a repository **GitHub Actions secret** in `LaiderBrainTrust/vc_hackathon`. It is also installed in the ignored, owner-only `.env.local` on Mat's build machine. No key is committed.

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

Setup uses default metadata monitoring: **no project conversation-content roots and no remote-control grant**. Machine credentials are not used by the app. Separate app/reviewer keys are loaded server-side from an owner-only runtime file; none is committed or saved in GitHub. Machine connectivity alone does not establish sponsor eligibility. The event instructions supplied by Mat point to a shared research workflow with tasks and versioned files; use that as the product integration target below.

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

For Second Look, adapt this handoff rather than adding a separate product: save the selected Akta findings with case ID and revision; dispatch review work to the fund-reader; save its answer to a task-specific path; return the exact input/output file versions. Use Nicrron for any model call and PRISM for its trace. Results are research proposals and cannot approve the LP response. A result for an older case revision remains historical. The product is only integrated after a live dispatch, result, and versioned file have been verified. The sponsor template has now been provisioned and its task/file flow verified (below). The app now implements that case-specific handoff in `server/adapters/roundtable.ts` and `server/case-research.ts`; see the integrated flow below.

SDK retries handle backoff. Do not run a tight polling loop, overwrite a shared `latest.md` without a version check, or assume a timed-out task was cancelled: the SDK guide says it remains available to a worker. Prefer unique task paths and resume the existing task ID.

## Remaining sponsor/product work

- Configure PRISM_TRACE_KEY and PRISM_PROJECT_ID; verify a recorded trace for the real Nicrron call. The HTTP adapter is implemented.
- Connect X1 separately if retained in the team's final scope.

Provider references: [Akta documentation](https://docs.akta.pro/llms.txt), [Roundtable CLI](https://github.com/roundtable-bot/roundtable-cli), [SDK guide](https://roundtable.bot/docs/bots), [Funds template](https://github.com/roundtable-bot/roundtable-cli/tree/main/templates/funds).


### Verified Roundtable task/file test

After workspace authorization, the supplied Funds template was initialized in temporary memory-backed storage on the build host. `fund-reader` and `quarter-brief` received separate identities. The worker handled both fictional funds, and a subsequent API read confirmed both task states as `done`:

- `4fd43867c7524096adb2db8fbe959606` — seven pinned source references.
- `9567d0308a3c4dce8d763174dc99284b` — eight pinned source references.
- Final brief: `vc-hackathon:funds/briefs/latest.md`, version `62a38eb8637f`, 5,194 characters, read back from the provider.

The test worker was stopped after verification. This was a sponsor-provided synthetic template test; its pre-existing code is not presented as newly authored app code. It establishes live SDK dispatch, completion and versioned-file retrieval, not a finished Second Look integration. The app integration is separate from this earlier template test. Workspace credentials and personal reporting configuration remain outside this team repository.

## Integrated app flow

`npm run dev` starts the actual Second Look reviewer alongside the API. Investor view searches Akta, saves dated findings against a case revision, dispatches the selected finding to Roundtable, and displays the completed question with exact input/output versions. The investor explicitly shares the question; sharing clears the old answer and requires a fresh fund-manager response. An older revision cannot replace the current question.

The reviewer now validates the dated input, then calls Nicrron for a source-linked question and explanation. It cannot change offer terms or approve a response. Historical rule-based results remain readable. PRISM tracing is implemented in `server/adapters/prism.ts`; a live receipt still requires the trace key and project ID.

Set the variables in `.env.example`: `AKTA_API_KEY`, `NICRRON_API_KEY`, `ROUNDTABLE_APP_KEY`, `ROUNDTABLE_WORKER_KEY`, `ROUNDTABLE_WORKER_ID`, and `ROUNDTABLE_PROJECT`. Both Roundtable identities need access to the same project. `ROUNDTABLE_ENV_FILE` optionally points to an owner-only environment file outside the repo. No machine CLI login is needed for SDK operation.

**Team access:** cloning the repository does not copy credentials. Akta is saved in GitHub Actions secrets, which authorized workflows can consume but teammates cannot download. The app's Roundtable keys remain on Mat's server because their grants also reach the reporting workspace; do not distribute those keys. Provision a dedicated demo workspace for team keys, or use a shared authenticated deployment that keeps keys server-side. A public/shared deployment is not yet configured.

### Observed app verification

At source `24f0cbf7337dba066b06e4d49b960c5a27de820a`, the browser retrieved live Akta news and dispatched Roundtable task `cf21a5930eb045b0978611cbd3bbaf9e`. The task completed; the app read back input version `cb377b065f42` and output version `4b6288a1786b`. Reload and API restart preserved the task. Explicit sharing advanced the case from revision 3 to 4, cleared the old answer, left previous approval historical, and showed the cited question in Fund manager view. Both investor and fund-manager layouts fit a 390px viewport. Thirteen automated tests and the TypeScript/Vite build passed. This verifies the app integration, not model reasoning, public deployment, or prize eligibility.

## Team runtime setup

See [TEAM_START.md](TEAM_START.md) for local and Codespaces setup. Both Akta and Nicrron keys are saved in GitHub Actions and repository Codespaces secrets. Admin access is now active; secret names were verified in LaiderBrainTrust/vc_hackathon. Restart an existing Codespace to receive them. Roundtable team-only credential provisioning remains outstanding.

### Nicrron through the app reviewer

Live app task `6ea9da9d095d4053b430653aacbff62d` completed via Roundtable with method `nicrron` and routed model `anthropic/claude-haiku-5-5`. The app retrieved and verified its source-versioned result. The first attempt was blocked after truncated model output; the current adapter rejects truncation, defaults to `nicrron/fastest`, and withholds monetary fields from the model. Sixteen tests and TypeScript/Vite build passed. This is app integration evidence, not a teammate Codespace acceptance test.


## Gaming flow and PRISM

The current entry begins with real Steam evidence plus Akta enrichment for Pounce Light, LocalThunk, and Aggro Crab. The catalog's fund exposures are explicitly fictional. `POST /api/case/gaming/refresh` persists an evidence snapshot before fetching. `POST /api/case/gaming/:id/prepare` pins a selected holding into a normal research run for the current case revision. The ordinary review/check/share routes then drive the same app workflow. All gaming routes require the investor's development role.

Set `PRISM_TRACE_KEY` and `PRISM_PROJECT_ID` on the API server. `PRISMTRACE_API_KEY` and `PRISMTRACE_PROJECT_ID` are also accepted by the adapter, but doctor checks the preferred names. The background reviewer posts synthetic evidence, model output, model name, latency and run ID to the documented trace endpoint. A successful HTTP response must contain an ID before the app reports `recorded`. A failed trace leaves the proposed question usable and reports `failed`; missing credentials report `not_configured`. Neither state satisfies a claim of verified sponsor tracing. No provider credential is placed in the trace messages.

The displayed PRISM receipt is saved in the same versioned review output as the question. Source/receipt mismatches are rejected on retrieval. Tracing is not a guarantee of factual or financial correctness.
