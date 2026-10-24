# Run Second Look as a teammate

## Use the current branch

```sh
git fetch origin
git switch codex/sponsor-setup
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
| Akta | Key saved | Admin must add key; write rejected with 403 | Set `AKTA_API_KEY` in ignored `.env.local` |
| Nicrron | Key saved | Admin must add key; write rejected with 403 | Set `NICRRON_API_KEY` in ignored `.env.local` |
| Roundtable | Not shared | Not shared | Team-only workspace keys required |
| PRISM | Not configured | Not configured | Integration and settings still needed |

GitHub Actions secrets are not downloadable. They do not automatically populate Codespaces or local clones. Repository admins can add the two provider keys in Settings → Secrets and variables → Codespaces. The current `silverstein` GitHub identity has write access but the Codespaces secret-write API requires admin rights. Do not print secrets in Actions logs or artifacts as a workaround.

The Roundtable keys on Mat's host also reach his reporting workspace. They must not be distributed to this team. A team-only workspace/connection is needed, with an app coordinator and reviewer sharing access to its project. Configure `ROUNDTABLE_APP_KEY`, `ROUNDTABLE_WORKER_KEY`, `ROUNDTABLE_WORKER_ID`, and `ROUNDTABLE_PROJECT`. This is a real outstanding setup dependency, not an automatic step the repository already performs.

## Codespaces option

On branch `codex/sponsor-setup`, use GitHub's Code → Codespaces → Create codespace on this branch. The devcontainer installs Node and dependencies and runs setup. Then run `npm run doctor` and `npm run dev`. Open forwarded port **5173**, keeping its visibility **Private**; do not expose port 3001. Codespaces creation may consume your account's quota. No Codespace has been created or billed by this setup task.

GitHub injects configured repository Codespaces secrets into newly started environments. Restart an existing Codespace after secret changes. Until the admin and Roundtable steps above are complete, live flow will report missing settings. The devcontainer configuration has been source-checked but has not yet been launched in a teammate's Codespace.

The role selector is a synthetic local demo, not participant authentication. Private Codespaces forwarding is suitable for an owner's development preview, not a multi-user hosted product. A shared team instance with one persistent case database still needs deployment and real access control.

## Try the live flow

Investor → search company → select match → find changes since report → select a finding → request Roundtable review. The Roundtable worker calls Nicrron with the saved finding and synthetic offer; it returns proposed question text and an explanation. Reload and check the saved task. Explicitly share the question, then switch to Fund manager and answer. A changed case makes older reviews historical.

The model cannot approve a response or change price/ownership fields; those remain deterministic app operations. Failed model calls fail visibly, with no silent rule-based replacement. PRISM is not yet connected, so do not claim that all four sponsor integrations are complete. See NICRRON_NINOO_SETUP.md for the unresolved Builder/Marketplace eligibility rule.
