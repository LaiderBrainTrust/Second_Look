# Backend handoff while Ryan designs the product

October 24, 2026. Owner: Mat/Codex. Ryan retains the UI lane in `src/`, `index.html` and public assets.

Deployment: [BACKEND_RELEASE_RECEIPT.json](BACKEND_RELEASE_RECEIPT.json). Source `a38ee65d93599657cfe6f18f6acfd86505b45f57` is live. Exact source, login protection, unchanged case and retained saved research were verified. The previous release and database backup remain available.

## What the UI can rely on

- Existing API response shapes, login, role selection and revision-checked commands are preserved. No frontend change is required for this release.
- Once a review has a saved Roundtable task ID and is queued, the server retrieves its result even if the browser closes. On restart it discovers pending tasks from SQLite, including tasks older than the 30 newest research rows shown by the list API.
- Every 10 seconds, at most three due queued reviews are checked. Transient failures keep the same task and back off to at most two minutes between attempts. Existing browser `/check` requests share the same in-flight operation. Failed validation becomes explicitly blocked, not invented success.
- Recovery never dispatches a replacement, shares a question, answers it, changes an offer or approves anything. Unconfirmed dispatches retain their original request IDs and require the existing explicit retry; blocked reviews retain the manual recheck path.
- A successful result is still just a proposed question. Explicit sharing and manager response remain necessary. Old-revision results cannot be shared against changed terms.
- Browser navigation to an extensionless route, such as `/investments/sample-fund`, loads the app shell. Ryan still owns implementing that route in the client. Missing API paths return JSON 404; missing asset files stay 404. HTML is not cached across releases.
- `/api/health` includes `releaseSha` when deployed with that metadata, so the running release can be matched to its source.

## Deployment after a reviewed UI merge

This is an **x1cloud maintainer command**, not a teammate setup step. It depends on the already-provisioned event service and owner-only runtime configuration. It does not provision hosting elsewhere or download secrets from GitHub.

```sh
# Replace with the full SHA that has actually merged into origin/main.
python3 scripts/deploy-hosted.py --commit FULL_MERGED_SHA
# After preflight, explicitly perform the authorized deployment:
python3 scripts/deploy-hosted.py --commit FULL_MERGED_SHA --deploy
```

The script builds an isolated release while the previous service runs, makes a consistent SQLite backup, switches the service, verifies its exact SHA locally and at the HTTPS origin, verifies anonymous case rejection and authenticated case access, then logs out its own check session. It keeps the current database path. A verification failure restores the previous service configuration and restarts it; it does not rewind the database or discard new user work.

Deployment restarts the service and invalidates existing in-memory logins. Coordinate the brief interruption with an active rehearsal; sign in again afterward. Backups, previous releases and failed build directories are retained outside Git. Do not prune them during the event. A build failure before the switch leaves the current service running.

The receipt is `DEPLOYMENT.json` in the release directory. It does not establish Ryan's visual acceptance or a spoken rehearsal. Review rollback compatibility before using this script for future database-schema changes; this release makes no destructive schema changes.

## Verification recorded for this slice

- 34 tests and TypeScript/Vite build passed.
- Added recovery tests: restart without a browser, old pending work, concurrent check deduplication, no overwrite of accepted state, transient backoff, independent task progress, explicit blocked/unconfirmed handling and shutdown suppression of late writes.
- Added HTTP tests: bookmarked route shell, missing API/asset behavior, preserved hosted authentication and release identity.
- Live recovery read of an existing verified Roundtable task saved the matching Nicrron result and PRISM trace after reopening a separate test database. It did not dispatch or make a new model call, and the case remained unchanged.

Still required for the final product: Ryan's UI implementation and integration, the deployed end-to-end visual check on his machine, spoken rehearsal, sponsor eligibility clarification and submission. None of these are established by this backend release.
