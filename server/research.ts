import { Router } from 'express';
import { AktaError, createAktaClient } from './adapters/akta.js';
import { recordProviderResult } from './adapters/status.js';

export function researchRouter() {
  const router = Router();
  const akta = createAktaClient({ onResult: (ok, detail) => recordProviderResult('akta', ok, detail) });
  router.use((req, res, next) => {
    // Local scaffold only. JSON POSTs and explicit local origins prevent drive-by credit use.
    const origin = req.header('origin');
    const allowed = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001'];
    if (req.method !== 'POST' || !req.is('application/json') || (origin && !allowed.includes(origin))) {
      res.status(403).json({ error: 'Use a JSON POST from the local application.' }); return;
    }
    next();
  });
  function field(value: unknown, label: string, max = 300) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new AktaError(`Provide a valid ${label}.`, 400);
    return value.trim();
  }
  router.post('/:operation', async (req, res) => {
    try {
      const body = req.body ?? {};
      switch (req.params.operation) {
        case 'search': res.json({ companies: await akta.search(field(body.query, 'company search')) }); break;
        case 'discover': res.json(await akta.discover(field(body.query, 'discovery query'), body.limit ?? 5)); break;
        case 'enrichment': res.json({ data: await akta.enrichment(field(body.companyId, 'company ID', 40)) }); break;
        case 'news': res.json(await akta.news(field(body.companyId, 'company ID', 40), field(body.after, 'report date', 10))); break;
        default: res.status(404).json({ error: 'Unknown research operation.' });
      }
    } catch (error) {
      res.status(error instanceof AktaError ? error.status : 500).json({ error: error instanceof AktaError ? error.message : 'Research could not be completed.' });
    }
  });
  return router;
}
