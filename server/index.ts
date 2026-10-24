import { dirname } from 'node:path';
import './env.js';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { loadSavedDemo, type SavedDemo } from './demo.js';
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

const recovery = createReviewRecovery(store);
const stopRecovery = startReviewRecovery(recovery);
const reviewer = new AbortController();
void runReviewer(reviewer.signal).catch(() => {
  if (!reviewer.signal.aborted) recordProviderResult('roundtable', false, 'Reviewer stopped. Check its credentials and restart the API to resume pending work.');
});
const app = createApp(store, { recovery, releaseSha: process.env.RELEASE_SHA, rehearsal: rehearsal || hosted, ...(hosted ? { hosted: { origin: process.env.DEMO_ORIGIN!, accessCode: process.env.DEMO_ACCESS_CODE! } } : {}) });
if (hosted) installHostedUi(app, 'dist');
const port = hosted ? Number(process.env.PORT ?? 3187) : 3001;
const server = app.listen(port, '127.0.0.1', () => console.log(`Second Look API: http://127.0.0.1:${port}`));
const stop = () => { stopRecovery(); reviewer.abort(); server.close(() => { store.close(); process.exit(0); }); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
