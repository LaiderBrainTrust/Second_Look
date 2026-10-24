import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createStore } from '../server/store.js';

it('preserves the case across restart and rolls back failed stale writes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'second-look-test-'));
  let store = createStore(join(dir, 'case.sqlite'));
  try {
    store.command('gp', 1, { kind: 'answer', distributionCents: 10_000_000, text: 'Fictional response.' });
    store.close(); store = createStore(join(dir, 'case.sqlite'));
    expect(store.read().revision).toBe(2);
    expect(store.read().answer?.distributionCents).toBe(10_000_000);
    expect(() => store.command('lp', 1, { kind: 'approve' })).toThrow('This case changed');
    expect(store.read().reviews).toHaveLength(0);
    store.command('lp', 2, { kind: 'approve' });
    store.command('lp', 2, { kind: 'approve' });
    expect(store.read().reviews).toHaveLength(1);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});
