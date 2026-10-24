> **Presenting today?** Use the hosted team-login path in [RYAN_DEMO.md](RYAN_DEMO.md). `npm run demo` is the independent local fallback with dated saved evidence; this page covers development setup.

# Run Second Look as a teammate

For a copyable coding-agent prompt and fresh-clone instructions, start with [README.md](../README.md#start-here--teammates-and-coding-agents).

## Use the current branch

```sh
git fetch origin
git switch main
npm ci
npm run setup
npm run doctor
npm run dev
```

Node 22.13+ is required. Open http://localhost:5173. `setup` creates `.env.local` only if absent and never overwrites it. `doctor` prints only whether each setting is present, never its value. It exits nonzero when live integrations are incomplete. The synthetic case still runs without keys.

`npm run dev` starts the UI, API, and Roundtable worker. Each clone has its own saved case in ignored `.local/second-look.sqlite`. Users of separate clones do not share the same app database. Provider tasks use unique paths; use separate reviewer identities per developer if independent worker ownership is needed.

## Credentials: actual current state

| Integration | GitHub Actions | Repository Codespaces | Local clones |
| --- | --- | --- | --- |
| Akta | Key saved | Key saved; restart Codespace | Set `AKTA_API_KEY` in ignored `.env.local` |
| Nicrron | Key saved | Key saved; restart Codespace | Set `NICRRON_API_KEY` in ignored `.env.local` |
| Roundtable | Restricted app/reviewer keys saved | Keys and project saved; restart Codespace | Obtain restricted team bot keys through the team credential channel |
| PRISM | Key and project ID saved | Key and project ID saved; restart Codespace | Set `PRISM_TRACE_KEY` and `PRISM_PROJECT_ID` |

GitHub Actions secrets are not downloadable. Repository Codespaces secrets **are now configured for all four sponsors** in `LaiderBrainTrust/vc_hackathon`; a new/restarted Codespace receives them as environment variables. They do not populate ordinary local clones. The authenticated `silverstein` identity now has repository admin rights. Secret names were verified after saving; teammate Codespace injection still needs a live check.

Roundtable is now configured with the dedicated `second-look-team` bank and two bot identities: `second-look-team-coordinator` and `second-look-team-reviewer`. Both were verified to have no access to the `vc-hackathon` reporting bank or `shared-notes` (HTTP 403 on reads). The team parent connection is not distributed. All four `ROUNDTABLE_*` runtime settings are available in repository Codespaces and Actions secrets. The actual app completed a review in this bank: task `5828d00fdb604e7580624aa766cb835e`, PRISM trace `6d56e04d-c5ee-441d-8880-b5ae9a9d337a`.

This is credential isolation inside the existing shared workspace, not a separate account: workspace co-owners can still access all data through the dashboard. The former development keys remain on the build host only. Do not use the shared workspace for private personal or client material.

## Codespaces option

On branch `main`, use GitHub's Code → Codespaces → Create codespace on this branch. The devcontainer installs Node and dependencies and runs setup. Then run `npm run doctor` and `npm run dev`. Open forwarded port **5173**, keeping its visibility **Private**; do not expose port 3001. Codespaces creation may consume your account's quota. No Codespace has been created or billed by this setup task.

GitHub injects configured repository Codespaces secrets into newly started environments. Restart an existing Codespace after secret changes. All required sponsor settings have been saved. Verify injection with `npm run doctor`; do not print secret values. The devcontainer configuration has been source-checked but has not yet been launched in a teammate's Codespace.

The role selector is a synthetic local demo, not participant authentication. Private Codespaces forwarding is suitable for an owner's development preview, not a multi-user hosted product. The authenticated event host now has one persistent case database and a case-scoped presenter session. It still uses fictional participant roles; see RYAN_DEMO.md for access and the verified deployment receipt.

## Try the live flow

Investor → Inspect the games → Check the three holdings → choose a game → Turn evidence into a manager question. Alternatively use the expandable company search in step 2. The Roundtable worker calls Nicrron with the saved finding and synthetic offer; it returns proposed question text and an explanation. Reload and check the saved task. Explicitly share the question, then switch to Fund manager and answer. A changed case makes older reviews historical.

The model cannot approve a response or change price/ownership fields; those remain deterministic app operations. Failed model calls fail visibly, with no silent rule-based replacement. A real PRISM model trace was accepted locally, and its setup doctor reports live/app connected. All four sponsor APIs have been exercised in the app; this does not settle Ninoo’s separate Builder/Marketplace eligibility requirement or verify a teammate’s environment. See NICRRON_NINOO_SETUP.md for the unresolved Builder/Marketplace eligibility rule.

## Setup acceptance — what your agent should report

1. Confirm the exact checkout path, branch, commit and Node version. Preserve existing changes.
2. Run `npm ci`, `npm run setup`, and `npm run doctor`. Missing keys mean live setup is incomplete; report names only and continue with the synthetic UI.
3. Reuse an existing server for this checkout or start `npm run dev`. `curl http://127.0.0.1:3001/api/health` should return `ok: true`; open port 5173 and verify the synthetic role-switching flow from README.md. Health alone does not verify providers.
4. If all live credentials are available, perform the research flow above once. Confirm the saved result says `nicrron`, retains source versions, and sharing requires a fresh fund-manager answer. A failed provider call is a failed live check, never substitute fabricated output.
5. For code changes run `npm test` and `npm run build` sequentially. Report actual results and the URL the teammate can open. Leave the server running for their preview, identifying its ports; do not launch duplicate servers.

This setup does not require X1 credentials, Ninoo CLI installation, or the standalone Roundtable Funds template. Ninoo Builder/Marketplace eligibility remains an organizer clarification, separate from getting this repository running.
