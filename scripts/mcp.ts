import { readFileSync, statSync } from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createSecondLookMcp } from '../server/mcp.js';

const origin = new URL(process.env.SECOND_LOOK_URL ?? 'https://secondlook.ac');
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('SECOND_LOOK_URL must be an HTTPS origin without credentials, path, query or fragment.');
const path = process.env.SECOND_LOOK_TOKEN_FILE;
if (!path) throw new Error('Set SECOND_LOOK_TOKEN_FILE to your private case connection file. See docs/MCP.md.');
if (process.platform !== 'win32' && (statSync(path).mode & 0o077)) throw new Error('The token file must be owner-only (chmod 600).');
const token = readFileSync(path, 'utf8').trim();
if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid case connection file.');
const server = createSecondLookMcp(async (tool, input) => {
  let response: Response;
  try {
    response = await fetch(new URL(`/api/agent/${tool}`, origin), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input), redirect: 'error', signal: AbortSignal.timeout(15000) });
  } catch { throw new Error('Could not reach Second Look. A write may have completed: read the current case before retrying.'); }
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? `Second Look returned HTTP ${response.status}. Read current state before retrying a write.`);
  return result;
});
await server.connect(new StdioServerTransport());
