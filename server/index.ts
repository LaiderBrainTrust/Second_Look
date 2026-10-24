import { dirname } from 'node:path';
import './env.js';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { loadComparisonExample, loadSavedDemo, type SavedDemo } from './demo.js';
import { createApp } from './app.js';
import { installHostedUi } from './hosted-ui.js';
import { createStore } from './store.js';
import { runReviewer } from './adapters/roundtable.js';
import { recordProviderResult } from './adapters/status.js';
import { createReviewRecovery, startReviewRecovery } from './review-recovery.js';

const hosted = process.env.NODE_ENV === 'production';
if (hosted && (!process.env.DEMO_ORIGIN || !process.env.DEMO_ACCESS_CODE || !process.env.DEMO_DATABASE)) throw new Error('Hosted demo needs DEMO_ORIGIN, DEMO_ACCESS_CODE and a persistent DEMO_DATABASE path.');
mkdirSync('.local', { recursive: true });
const rehearsal = process.argv.includes('--demo');
const databasePath = hosted ? process.env.DEMO_DATABASE! : rehearsal ? `${mkdtempSync('.local/rehearsal-')}/second-look.sqlite` : '.local/second-look.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });
const store = createStore(databasePath);
if (rehearsal || (hosted && store.read().revision === 1 && !store.latestGaming())) {
  const capture = JSON.parse(readFileSync(new URL('../fixtures/demo-capture.json', import.meta.url), 'utf8')) as SavedDemo;
  loadSavedDemo(store, capture);
  console.log(`Saved research rehearsal: ${capture.capturedAt}. New private database: ${databasePath}`);
}

if (rehearsal && !hosted && process.argv.includes("--comparison")) loadComparisonExample(store);

const recovery = createReviewRecovery(store.recoveryStore);
const stopRecovery = startReviewRecovery(recovery);
const reviewer = new AbortController();
void runReviewer(reviewer.signal).catch(() => {
  if (!reviewer.signal.aborted) recordProviderResult('roundtable', false, 'Reviewer stopped. Check its credentials and restart the API to resume pending work.');
});
const app = createApp(store, { recovery, releaseSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.RELEASE_SHA, rehearsal: rehearsal || hosted, ...(hosted ? { hosted: { origin: process.env.DEMO_ORIGIN!, accessCode: process.env.DEMO_ACCESS_CODE! } } : {}) });
if (hosted) installHostedUi(app, 'dist');
const port = hosted ? Number(process.env.PORT ?? 3187) : 3001;
const bindHost = process.env.BIND_HOST ?? '127.0.0.1';
if (!['127.0.0.1', '0.0.0.0', '::'].includes(bindHost) || !Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid BIND_HOST or PORT.');
const server = app.listen(port, bindHost, () => console.log(`Second Look API listening on ${bindHost}:${port}`));
const stop = () => { stopRecovery(); reviewer.abort(); server.close(() => { store.close(); process.exit(0); }); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
