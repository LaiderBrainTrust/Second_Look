import type { GamingSnapshot } from '../shared/gaming.js';
import type { ResearchRun } from '../shared/research.js';
import type { createStore } from './store.js';
import { seedCase } from './domain.js';

export interface SavedDemo {
  schemaVersion: 1;
  capturedAt: string;
  disclosure: string;
  snapshot: GamingSnapshot;
  run: ResearchRun;
}

// A capture can only seed the unchanged fictional starting case. Never relabel
// a result generated for another offer, or reset an existing case's history.
export function loadSavedDemo(store: ReturnType<typeof createStore>, capture: SavedDemo) {
  const seed = seedCase();
  const { run, snapshot } = capture;
  const input = run?.input;
  if (JSON.stringify(store.read()) !== JSON.stringify(seed) || store.listResearch().length || store.latestGaming()) {
    throw new Error('Saved demo requires an empty, new rehearsal database. Existing work is preserved.');
  }
  if (capture.schemaVersion !== 1 || !Number.isFinite(Date.parse(capture.capturedAt))
    || snapshot?.status !== 'ready' || !snapshot.holdings.length
    || run?.status !== 'done' || run.acceptedRevision !== undefined || !run.taskId
    || run.caseId !== seed.id || run.caseRevision !== seed.revision
    || run.gamingContext?.snapshotId !== snapshot.id
    || !snapshot.holdings.some(item => item.holding.id === run.gamingContext?.holding.id)
    || !input || input.caseId !== seed.id || input.caseRevision !== seed.revision || input.runId !== run.id
    || input.offer.version !== seed.offer.version || input.offer.purchasePriceCents !== seed.offer.purchasePriceCents
    || input.offer.distributionRecipient !== seed.offer.distributionRecipient
    || run.result?.method !== 'nicrron' || run.result.caseRevision !== seed.revision || run.result.caseId !== seed.id
    || run.result.findingId !== run.selectedFindingId || input.finding.source.id !== run.selectedFindingId
    || !run.inputSource || !run.result.sources.some(source => source.bank === run.inputSource?.bank && source.path === run.inputSource.path && source.version === run.inputSource.version)
    || run.result.trace?.status !== 'recorded' || !run.result.trace.id) {
    throw new Error('Saved demo does not match the initial offer and its verified sponsor receipts.');
  }
  store.saveGaming(snapshot);
  store.saveResearch(run);
}

// Local-only rehearsal extension. Never runs against a hosted or existing case.
export function loadComparisonExample(store: ReturnType<typeof createStore>) {
  const state = store.read();
  if (JSON.stringify(state) !== JSON.stringify(seedCase())) throw new Error('Comparison example requires a fresh fictional case.');
  const offer = (id: string, buyer: string, payment: number, recipient: 'seller' | 'buyer') => ({
    id, buyer, version: 1, purchasePriceCents: payment, priceAdjustmentCents: 0, sellerFeesCents: 0,
    distributionRecipient: recipient, distributionBasisSourceId: null, recordDate: '2026-10-24', expiresAt: null,
    sourceNote: 'Fictional comparison example. Fees and price adjustments explicitly assumed to be zero.',
    conditions: 'Illustrative terms only.', withdrawn: false,
  });
  state.diligence = { offers: [offer('example-a', 'Fictional offer A', 70_000_000, 'seller'), offer('example-b', 'Fictional offer B', 76_000_000, 'buyer')], questions: [], conditions: [], history: [] };
  store.db.prepare('UPDATE cases SET body=? WHERE id=?').run(JSON.stringify(state), state.id);
}
