# Use Second Look from Claude Code and Codex

This is a working **stdio MCP server**, using the official TypeScript MCP SDK. It connects to the hosted Second Look API. It supports Claude Code, Codex and desktop clients with local MCP-process support. It is **not** a remote OAuth connector for Claude's browser-only custom integrations.

Each connection belongs to one account, one case and one scope. Tokens expire after 24 hours. No sponsor credentials, database access, approval tools or access-granting tools are exposed.

## Team setup

From your clone, on Node 24:

```sh
npm ci
npm run connect:agent
```

Run setup in your own terminal, not by pasting your password into a model conversation. It prompts for a sign-in or early-access registration, then your case, scope and agent label. If you have no case, it can create one from your entered terms; unresolved adjustments remain unknown and external research is disabled. It does not invent a financial case for you.

Choose **read** for analysis only. Choose **work** deliberately to allow the assistant to save comparison offers, save the decisive manager question, or answer within your assigned role. Work does not allow approvals, invitations or new keys.

The script saves the token to an owner-only file under `~/.config/second-look/` and prints commands specific to your clone. Run the printed Codex or Claude Code command. Restart/reload the client if it requires that to discover newly configured tools. Do not commit the token file. The printed config contains only its path, not its value.

To use another deployment, set `SECOND_LOOK_URL` to its exact HTTPS origin before setup. The default is `https://secondlook.ac`, which resolves to Railway. To access cases still held on the older event host, explicitly set its HTTPS origin; the two deployments may hold different case databases.

Example manual configuration pattern (substitute the exact absolute paths printed by setup):

```sh
codex mcp add second-look \
  --env SECOND_LOOK_URL=https://YOUR_HOST \
  --env SECOND_LOOK_TOKEN_FILE=/absolute/private/key.token \
  -- /absolute/path/to/node --import /absolute/repo/node_modules/tsx/dist/loader.mjs /absolute/repo/scripts/mcp.ts

claude mcp add --scope local second-look \
  -e SECOND_LOOK_URL=https://YOUR_HOST \
  -e SECOND_LOOK_TOKEN_FILE=/absolute/private/key.token \
  -- /absolute/path/to/node --import /absolute/repo/node_modules/tsx/dist/loader.mjs /absolute/repo/scripts/mcp.ts
```

Absolute paths matter: the MCP client may launch outside your repository. Setup emits POSIX-shell commands; on Windows configure the equivalent command, args and environment in your client's UI. The Node program runs on Windows, but do not paste POSIX quoting into PowerShell unchanged.

## Tools

| Tool | Effect |
| --- | --- |
| `secondlook_read_case` | Read current case, role and revision; private fields omitted for counterparties; history omitted for brevity |
| `secondlook_compare_offers` | Investor-only deterministic threshold and current confirmed comparison |
| `secondlook_list_questions` | Paginated questions visible to your role |
| `secondlook_save_offer` | Investor work scope: save a private comparison quote, never approve or replace the chosen deal |
| `secondlook_request_distribution` | Investor work scope: save decisive manager question, clear the old answer and invalidate old approvals |
| `secondlook_answer_distribution` | Manager work scope: save an explicitly supplied distribution and supporting explanation |
| `secondlook_answer_question` | Work scope: answer a question assigned to your role; investor resolution remains separate |

Try: “Compare the offers in this case. What fact could change which one pays more? Do not change anything.”

For an authorized investor work connection: “Save this quote with these exact terms, then show the comparison. Leave anything I didn't provide unknown.”

For an authorized manager connection: “Record this amount and explanation from the distribution notice as my response.” Never turn a model's guess into a manager assertion.

## Revocation and boundaries

Authenticated account routes (same browser session and origin rules as the app):

- `POST /api/cases/:id/agent-keys {label,scope:"read"|"work"}` returns the raw token once.
- `GET /api/cases/:id/agent-keys` lists only your own key metadata.
- `POST /api/cases/:id/agent-keys/:keyId/revoke {}` revokes your key.

Setup prints the exact revocation path. Deleting a local MCP entry alone does not revoke its server key. Keys also stop working after expiry, a password change or removal from the case. Re-inviting the same person does not reactivate their old keys. A token cannot choose another case or change its role. Browser cookies and the team presenter code are not accepted by the agent route.

The local MCP process reads its token file once at startup and sends it only in the Authorization header to the configured HTTPS origin. Redirects are rejected. It never loads `.env.local` or sponsor credentials. Network requests time out; ambiguous write failures instruct the assistant to read current state before retrying. All mutations use existing server revision and role checks. A tool description's instructions do not replace these checks.

The backend route is `/api/agent/:tool`; it is an internal HTTP bridge for the local MCP process, **not itself an MCP endpoint**. Do not add that URL as a remote MCP server. A remote OAuth MCP service is a future, distinct piece of work.

## Verification

Tests exercise MCP initialization, schemas and tool calls through the real stdio transport, plus backend role/scope checks, cross-case argument rejection, stale revision, expiration, explicit revocation, password change and membership removal/re-addition. `docs/evaluations/second-look.xml` provides a fixed-scenario human/agent evaluation set; it is not evidence that a Claude or Codex model has independently passed it. Each team member must verify their own host connection.

## Public connection instructions

`/mcp` is a public human-readable setup page. `/mcp.txt` and `/llms.txt` contain agent-readable instructions, while `/mcp.json` describes the local bridge and tools. These routes need no case login and contain no keys. **They are documentation, not remote MCP protocol endpoints.** POST `/mcp` returns 405 with the setup location.

Point a coding assistant at `https://YOUR_DEPLOYMENT/mcp.txt` to explain/setup the connection. Individual sign-in still happens in the user's terminal. Use the HTTPS origin that actually hosts the app; the purchased domain is not usable until DNS and hosting are verified.

Two additional tools extend the original seven: `secondlook_read_funding` reads the private funding/deadline comparison, and `secondlook_save_funding` saves explicitly supplied funding constraints with work scope. Nine tools are now advertised. The offer tool also accepts payment and distribution dates. See [X1_CONTEXT.md](X1_CONTEXT.md).
