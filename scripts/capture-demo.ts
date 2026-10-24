import '../server/env.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';
import { loadSavedDemo, type SavedDemo } from '../server/demo.js';
import type { ResearchRun } from '../shared/research.js';

// Authoring command: needs the normal local API + configured reviewer running.
// Reuse dated public research; make a REAL sponsor review of the untouched seed
// offer. Do not rewrite case IDs, revisions, task receipts or model responses.
const destination = process.argv[2];
if (!destination) throw new Error('Usage: npm run capture:demo -- fixtures/new-capture.json (existing files are never overwritten)');
const source = await fetch('http://127.0.0.1:3001/api/case/gaming', { headers: { 'x-demo-role': 'lp' } });
if (!source.ok) throw new Error('Start the configured app and fetch gaming evidence first.');
const data = await source.json();
const snapshot = data.savedSnapshot ?? data.snapshot;
if (snapshot?.status !== 'ready') throw new Error('Complete an external evidence check first.');
const store = createStore(':memory:');
store.saveGaming(snapshot);
const server = createApp(store).listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('No local API address');
const api = async (path: string, body: unknown) => {
  const response = await fetch(`http://127.0.0.1:${address.port}/api/case/${path}`, { method: 'POST', headers: { 'x-demo-role': 'lp', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
};
try {
  let run: ResearchRun = await api(`gaming/${snapshot.id}/prepare`, { expectedRevision: 1, holdingId: 'pounce-light' });
  run = await api(`research/${run.id}/review`, { expectedRevision: 1, findingId: run.selectedFindingId });
  for (let attempt = 0; attempt < 40 && run.status === 'queued'; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    run = await api(`research/${run.id}/check`, {});
  }
  if (run.status !== 'done') throw new Error(`Review not complete: ${run.status}. No capture written.`);
  const capture: SavedDemo = { schemaVersion: 1, capturedAt: new Date().toISOString(), disclosure: 'Saved real Steam/Akta observations and a completed Nicrron review via Roundtable, with PRISM receipt. Fund, holdings and offer are fictional. Opening this capture makes no fresh provider call.', snapshot, run };
  const check = createStore(':memory:');
  try { loadSavedDemo(check, capture); } finally { check.close(); }
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(capture, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ destination, capturedAt: capture.capturedAt, taskId: run.taskId, traceId: run.result?.trace?.id }));
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  store.close();
}
