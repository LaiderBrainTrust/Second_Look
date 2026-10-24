import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

if (!process.stdin.isTTY) throw new Error('Run this setup interactively in your own terminal. Do not put account passwords into an agent prompt.');
let muted = false;
const output = new Writable({ write(chunk, _encoding, done) { if (!muted) process.stdout.write(chunk); done(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
async function ask(label: string, secret = false) {
  const answer = rl.question(label); muted = secret;
  try { const value = await answer; return secret ? value : value.trim(); } finally { muted = false; if (secret) process.stdout.write('\n'); }
}
const origin = new URL(process.env.SECOND_LOOK_URL ?? 'https://secondlook.ac');
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('SECOND_LOOK_URL must be an HTTPS origin.');
let cookie = '';
async function call(path: string, body?: unknown) {
  const response = await fetch(new URL(path, origin), { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type':'application/json', Origin:origin.origin, Cookie:cookie }, ...(body === undefined ? {} : {body:JSON.stringify(body)}), redirect:'error', signal:AbortSignal.timeout(15000) });
  const next = response.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result;
}
const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
try {
  console.log(`Connect an assistant to one case at ${origin.origin}. Your sponsor credentials are never shared.`);
  const create = (await ask('Create an early-access account? [y/N] ')).toLowerCase() === 'y';
  const handle = await ask('Account handle: ');
  const password = await ask('Account password (hidden): ', true);
  if (create) await call('/api/accounts', {handle,password,displayName:await ask('Display name: '),registrationCode:await ask('Team enrollment code (hidden): ',true)});
  else await call('/api/session/login', {handle,password});
  let { cases } = await call('/api/cases') as { cases:{id:string;title:string;role:string}[] };
  if (!cases.length) {
    if ((await ask('No cases yet. Create your first case? [y/N] ')).toLowerCase() !== 'y') throw new Error('Create or join a case before connecting an assistant.');
    const title = await ask('Case title: '), ownerEntity = await ask('Owner/entity: '), offerNote = await ask('Offer source reference: ');
    const price = await ask('Purchase payment in USD, no commas: ');
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(price)) throw new Error('Enter a dollar amount with at most two decimal places.');
    const [dollars, cents=''] = price.split('.');
    const distributionRecipient = await ask('Who retains the distribution? [seller/buyer] ');
    const question = await ask('Initial question for the manager: ');
    const c = await call('/api/cases', {requestId:randomUUID(),title,ownerEntity,offerNote,purchasePriceCents:Number(dollars)*100+Number(cents.padEnd(2,'0')),priceAdjustmentCents:null,distributionRecipient,question,allowExternalResearch:false});
    cases = [{id:c.id,title:c.title,role:'lp'}];
  }
  cases.forEach((c,i)=>console.log(`${i+1}. ${c.title} (${c.role})`));
  const index = Number(await ask('Case number: ')) - 1;
  if (!Number.isInteger(index) || !cases[index]) throw new Error('Choose a listed case.');
  const selected = cases[index];
  console.log('Read can inspect your role-visible case. Work can also save offers/questions or answers within your role. Neither can approve a decision, invite users or grant access. Keys expire in 24 hours.');
  const scope = await ask('Scope [read/work]: '); if (!['read','work'].includes(scope)) throw new Error('Choose read or work.');
  const label = await ask('Agent label (e.g. my-codex): ');
  const key = await call(`/api/cases/${selected.id}/agent-keys`,{label,scope});
  const path = resolve(homedir(),'.config','second-look',`${key.id}.token`);
  try { mkdirSync(dirname(path),{recursive:true,mode:0o700}); writeFileSync(path,key.token+'\n',{mode:0o600,flag:'wx'}); }
  catch (error) { await call(`/api/cases/${selected.id}/agent-keys/${key.id}/revoke`,{}); throw error; }
  const script = resolve('scripts/mcp.ts'), tsx = resolve('node_modules/tsx/dist/loader.mjs');
  const command = `${quote(process.execPath)} --import ${quote(tsx)} ${quote(script)}`;
  console.log(`Saved owner-only key file: ${path}\nExpires: ${key.expiresAt}\n\nRun one of these in your own terminal:\n`);
  console.log(`codex mcp add second-look --env ${quote('SECOND_LOOK_URL='+origin.origin)} --env ${quote('SECOND_LOOK_TOKEN_FILE='+path)} -- ${command}`);
  console.log(`claude mcp add --scope local second-look -e ${quote('SECOND_LOOK_URL='+origin.origin)} -e ${quote('SECOND_LOOK_TOKEN_FILE='+path)} -- ${command}`);
  console.log(`\nTo revoke: sign in to this case and POST /api/cases/${selected.id}/agent-keys/${key.id}/revoke. Never commit or paste the token file.`);
} catch (error) { console.error(error instanceof Error ? error.message : 'Connection setup failed.'); process.exitCode = 1; }
finally { if(cookie) { try { await call('/api/session/logout',{}); } catch {} } rl.close(); }
