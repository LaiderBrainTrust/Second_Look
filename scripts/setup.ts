import { copyFileSync, existsSync, chmodSync } from 'node:fs';

if (!process.argv.includes('--check') && !existsSync('.env.local')) {
  copyFileSync('.env.example', '.env.local'); chmodSync('.env.local', 0o600);
  console.log('Created ignored .env.local without overwriting existing configuration.');
}
await import('../server/env.js');
const required = ['AKTA_API_KEY', 'NICRRON_API_KEY', 'ROUNDTABLE_APP_KEY', 'ROUNDTABLE_WORKER_KEY', 'ROUNDTABLE_WORKER_ID', 'ROUNDTABLE_PROJECT'];
let missing = false;
for (const key of required) {
  const present = Boolean(process.env[key]); missing ||= !present;
  console.log(`${key}: ${present ? 'configured' : 'MISSING'}`);
}
console.log('PRISM: not implemented. X1: optional, not connected.');
console.log('Configuration is not proof of a live connection. See docs/TEAM_START.md.');
console.log(missing ? 'The local case demo runs, but live research needs the missing settings.' : 'Ready to run npm run dev and exercise live research.');
if (missing && process.argv.includes('--check')) process.exitCode = 1;
