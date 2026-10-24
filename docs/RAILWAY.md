# Railway deployment — keep the Node backend and persistent state

This repository includes a Node 24 Docker image. It serves the built UI and API together, with the Roundtable reviewer and recovery loop in the same process. Use one Railway service and one replica, with sleeping/serverless disabled. No Cloudflare Worker or database rewrite is needed.

Intended domain: **secondlook.ac**, reportedly purchased by Stratten at Namecheap (owner report; account ownership and DNS not yet verified). Leave registration at Namecheap. Add the domain to the Railway service and copy the exact DNS records Railway supplies into Namecheap; do not guess a Railway hostname or replace unrelated mail records. Once HTTPS is active, set `DEMO_ORIGIN=https://secondlook.ac`. A `www` hostname needs its own explicit redirect to the canonical origin, rather than a second independent app origin.

## Immediate sponsor activation — October 24, 2:40pm EDT

The authenticated provider endpoint on **secondlook.ac** currently reports all four sponsors as `not_configured`. Earlier live receipts came from the build/fallback host; GitHub Actions and Codespaces secrets do not populate Railway. Do not describe the domain as ready for live sponsor research until it passes the workflow below.

Stratten: open the Second Look **production service → Variables → Raw Editor**. Add the eight settings from the privately supplied `railway-sponsors.env` file, preserving the existing variables, especially `DEMO_*` and `X1_*`. Apply the variables and deploy/restart the service. The file contains only team sponsor credentials, not personal X1 or reporting credentials. Do not commit or post the file publicly.

After restart, the sponsors should move to `not verified`; this means configured, not tested. In the app, run a fresh Akta company/game lookup and submit its evidence for review. Wait for a completed Roundtable/Nicrron result and PRISM trace. Only successful calls turn the respective process badges to `verified`. A restart clears these process badges; saved task/trace receipts remain the durable evidence.

X1 is optional and case-specific. Its global badge now says `available` when connections are enabled; it never means another investor's account is connected. The earlier `not implemented` label was a status bug, corrected in this release. Real hosted X1 consent/search/import/disconnect acceptance is documented in [X1_OAUTH.md](X1_OAUTH.md).

## Service setup

1. Connect `LaiderBrainTrust/Second_Look`, branch `main`. Let Railway build the root Dockerfile; keep its entrypoint and command.
2. Attach a persistent Railway volume at `/data`. This is required **before accepting user cases**. Set `DEMO_DATABASE=/data/second-look.sqlite` (also the image default).
3. Configure the final HTTPS host in `DEMO_ORIGIN`. Add the purchased custom domain in Railway and use the DNS records Railway supplies. Until custom DNS works, use Railway's generated HTTPS domain and set `DEMO_ORIGIN` to that exact origin. The app accepts mutations only from the configured origin.
4. Supply `DEMO_ACCESS_CODE` (at least 24 characters) as a runtime secret. This remains the example presenter code and the early-access enrollment code; real account passwords are separate.
5. Copy the eight sponsor runtime settings through the team's authorized secret channel: `AKTA_API_KEY`, `NICRRON_API_KEY`, `PRISM_TRACE_KEY`, `PRISM_PROJECT_ID`, `ROUNDTABLE_APP_KEY`, `ROUNDTABLE_WORKER_KEY`, `ROUNDTABLE_WORKER_ID`, `ROUNDTABLE_PROJECT`. GitHub secrets do not automatically populate Railway.
6. Railway deployments report `RAILWAY_GIT_COMMIT_SHA` automatically; it takes precedence over a manually configured `RELEASE_SHA`. For other hosts, set `RELEASE_SHA` to the full deployed Git commit for `/api/health` verification. Do not put secrets in build arguments. `PORT` is supplied by Railway; the image defaults to 3000. `BIND_HOST=0.0.0.0` is already set by the image.
7. Use `/api/health` as the HTTP health-check path. Verify the exact release, protected data APIs and the user journey before sharing the domain as the main app.

The container starts briefly as root to make the mounted `/data` and app-local directories writable, then runs Node as the unprivileged `node` user. This addresses Railway's root-owned volume mount behavior. Do not override the entrypoint with an unrelated command. The runtime retains `tsx` as a production dependency because it uses `node --import tsx`. Development dependencies are pruned after building, so test runners and build-only tooling are not installed in the running image.

References: [Railway volumes and permissions](https://docs.railway.com/volumes), [public networking and domains](https://docs.railway.com/networking/public-networking).

## Preserve state during cutover

There are now account/password hashes, sessions, memberships and invitation records in the **same SQLite database** as cases and research. Preserve the whole database, not just the cases table. Do not ship it in the image or repository.

- Choose a brief write pause on the old service.
- Make a consistent SQLite backup using the SQLite backup API, not a naive copy of a live WAL-mode file.
- Transfer the backup privately to the new service's volume and verify `PRAGMA integrity_check` before startup. Keep the prior service/data as a documented rollback point.
- Start the new instance, verify current case count and revision, account login, a saved answer and review history, then promote the custom domain.
- Never roll the expanded database back onto a pre-account release: that code does not isolate research by case. The updated local deployment script refuses this downgrade and stops rather than rolling back unsafely if verification fails after account cases exist.
- Avoid two writable hosts with separate copies of the database. Restart/logout behavior: presenter and individual-account sessions are persistent in SQLite. Presenter sessions expire after eight hours; logout removes the saved session, and rotating DEMO_ACCESS_CODE invalidates prior presenter sessions. Browser cookies are host-specific, so users sign in again on a new domain. The first upgrade from memory-only presenter sessions requires one new login; later redeployments preserve sessions when the volume and access code remain unchanged.
- Enable volume backups on the hosting account and test restoration to a separate volume. The existing deploy script's local backup does not configure Railway backups.

## Verification gate

Use separate browser profiles for investor, manager and buyer. Register an early-access test investor, create a clearly labeled test case, accept two invitations, answer, approve and revise the offer. Confirm that old approvals remain historical, another investor cannot access the case, a revoked participant loses access, and a service restart preserves state. Keep the main presentation case intact.

`npm test` covers these behaviors at HTTP/storage level. It does not prove the Railway account, DNS, volume, backups or Ryan's UI are configured. The current x1cloud service stays the fallback until these checks pass.

Production dependency audit: `npm audit --omit=dev` reports zero known vulnerabilities at this check. The development-only Vitest dependency tree still reports advisories; it is pruned from the container and its dev/test servers must not be exposed publicly. This is not a full security audit.

October 24 observation: `https://secondlook.ac` resolves to Railway and serves the PR12 frontend assets. Its manually configured health SHA was older than those assets; this release prefers Railway’s deployment commit variable. Volume contents, sponsor configuration and backup policy still require hosting-owner verification.
