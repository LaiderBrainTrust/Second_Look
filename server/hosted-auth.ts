import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Express } from 'express';
import type { Role } from '../shared/contracts.js';

export interface HostedOptions { origin: string; accessCode: string }
// One explicitly provisioned team presenter account, permitted to operate the
// three fictional roles in this case. This is not real counterparty identity.
export function installHostedAuth(app: Express, options: HostedOptions) {
  if (new URL(options.origin).protocol !== 'https:' || options.accessCode.length < 24) throw new Error('Hosted demo needs an HTTPS origin and a strong access code.');
  const sessions = new Map<string, { expires: number; role: Role; caseId: string }>();
  const cookieName = '__Host-second-look';
  const cookie = (value: string, age = 28800) => `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
  function token(value?: string) { return value?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? ''; }
  let attempts = 0; let windowStart = Date.now();
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.header('origin') !== options.origin) {
      res.status(403).json({ error: 'Open the hosted app to make changes.' }); return;
    }
    const id = token(req.header('cookie'));
    const session = sessions.get(id);
    if (session && session.expires <= Date.now()) sessions.delete(id);
    if (session && session.expires > Date.now() && session.caseId === 'sample-fund') res.locals.session = session;
    res.locals.sessionId = id;
    next();
  });
  app.get('/api/session', (_req, res) => res.json({ hosted: true, authenticated: Boolean(res.locals.session), role: res.locals.session?.role }));
  app.post('/api/session/login', (req, res) => {
    if (Date.now() - windowStart >= 60000) { attempts = 0; windowStart = Date.now(); }
    if (++attempts > 60) { res.status(429).json({ error: 'Too many sign-in attempts. Try again in one minute.' }); return; }
    const supplied = typeof req.body?.code === 'string' ? Buffer.from(req.body.code) : Buffer.alloc(0);
    const expected = Buffer.from(options.accessCode);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { res.status(401).json({ error: 'The team access code did not match.' }); return; }
    for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id);
    if (sessions.size >= 500) { res.status(503).json({ error: 'The demo is at session capacity.' }); return; }
    const id = randomBytes(32).toString('hex');
    sessions.set(id, { expires: Date.now() + 28800000, role: 'lp', caseId: 'sample-fund' });
    res.setHeader('Set-Cookie', cookie(id)); res.json({ authenticated: true, role: 'lp' });
  });
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') { next(); return; }
    if (!res.locals.session) { res.status(401).json({ error: 'Sign in with the team access code.' }); return; }
    next();
  });
  app.post('/api/session/role', (req, res) => {
    if (!['lp', 'gp', 'buyer'].includes(req.body?.role)) { res.status(400).json({ error: 'Choose a fictional participant.' }); return; }
    res.locals.session.role = req.body.role;
    res.json({ role: res.locals.session.role });
  });
  app.post('/api/session/logout', (_req, res) => {
    sessions.delete(res.locals.sessionId); res.setHeader('Set-Cookie', cookie('', 0)); res.json({ ok: true });
  });
}
