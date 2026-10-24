import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { installHostedUi } from '../server/hosted-ui.js';
import { createStore } from '../server/store.js';

it('serves bookmarked UI routes while preserving auth, API/asset 404s and the exact release identity', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'second-look-ui-'));
  writeFileSync(join(dir, 'index.html'), '<h1>Product shell</h1>');
  const store = createStore(':memory:');
  const sha = 'a'.repeat(40);
  const app = createApp(store, { releaseSha: sha, hosted: { origin: 'https://demo.test', accessCode: 'a'.repeat(32) } });
  installHostedUi(app, dir);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const path of ['/', '/investments/sample-fund']) {
      const response = await fetch(base + path, { headers: { Accept: 'text/html' } });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toContain('Product shell');
    }
    expect((await fetch(base + '/assets/missing.js')).status).toBe(404);
    expect((await fetch(base + '/api/case')).status).toBe(401);
    const login = await fetch(base + '/api/session/login', { method: 'POST', headers: { Origin: 'https://demo.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'a'.repeat(32) }) });
    const missing = await fetch(base + '/api/typo', { headers: { Cookie: login.headers.get('set-cookie')!.split(';')[0] } });
    expect(missing.status).toBe(404); expect(missing.headers.get('content-type')).toContain('application/json');
    expect(await (await fetch(base + '/api/health')).json()).toMatchObject({ releaseSha: sha });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); rmSync(dir, { recursive: true }); }
});
