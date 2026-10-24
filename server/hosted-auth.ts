import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Express } from 'express';
import type { Role } from '../shared/contracts.js';
import type { WorkspaceAccess } from './workspace-access.js';

export interface HostedOptions { origin: string; accessCode: string }
// One explicitly provisioned team presenter account, permitted to operate the
// three fictional roles in this case. This is not real counterparty identity.
export function installHostedAuth(app: Express, options: HostedOptions, access?: WorkspaceAccess) {
  if (new URL(options.origin).protocol !== 'https:' || options.accessCode.length < 24) throw new Error('Hosted demo needs an HTTPS origin and a strong access code.');
  const sessions = new Map<string, { expires: number; role: Role; caseId: string; mode: 'presenter' }>();
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
    else if (access) res.locals.session = access.session(id);
    res.locals.sessionId = id;
    next();
  });
  app.get('/api/session', (_req, res) => res.json({ hosted: true, authenticated: Boolean(res.locals.session), role: res.locals.session?.role, mode: res.locals.session?.mode, user: res.locals.session?.user }));
  app.post('/api/session/login', (req, res, next) => {
    if (Date.now() - windowStart >= 60000) { attempts = 0; windowStart = Date.now(); }
    if (++attempts > 60) { res.status(429).json({ error: 'Too many sign-in attempts. Try again in one minute.' }); return; }
    if (access && req.body?.code === undefined) {
      try {
        const user = access.authenticate(req.body ?? {});
        const id = access.startSession(user.id);
        res.setHeader('Set-Cookie', cookie(id)); res.json({ authenticated: true, mode: 'account', user });
      } catch (error) { next(error); }
      return;
    }
    const supplied = typeof req.body?.code === 'string' ? Buffer.from(req.body.code) : Buffer.alloc(0);
    const expected = Buffer.from(options.accessCode);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { res.status(401).json({ error: 'The team access code did not match.' }); return; }
    for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id);
    if (sessions.size >= 500) { res.status(503).json({ error: 'The demo is at session capacity.' }); return; }
    const id = randomBytes(32).toString('hex');
    sessions.set(id, { expires: Date.now() + 28800000, role: 'lp', caseId: 'sample-fund', mode: 'presenter' });
    res.setHeader('Set-Cookie', cookie(id)); res.json({ authenticated: true, role: 'lp' });
  });
  if (access) {
    let registrations = 0; let registrationWindow = Date.now();
    app.post(['/api/accounts', '/api/invitations/accept'], (req, res, next) => {
      try {
        if (Date.now() - registrationWindow >= 60000) { registrations = 0; registrationWindow = Date.now(); }
        if (++registrations > 20) { res.status(429).json({ error: 'Too many account or invitation attempts. Try again in one minute.' }); return; }
        if (req.path === '/api/accounts') {
          const supplied = typeof req.body?.registrationCode === 'string' ? Buffer.from(req.body.registrationCode) : Buffer.alloc(0);
          const expected = Buffer.from(options.accessCode);
          if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { res.status(403).json({ error: 'A team enrollment code is required to create an early-access account.' }); return; }
          const user = access.register(req.body ?? {});
          const id = access.startSession(user.id);
          res.setHeader('Set-Cookie', cookie(id)); res.status(201).json({ authenticated: true, mode: 'account', user });
        } else {
          const current = res.locals.session?.mode === 'account' ? res.locals.session.user : undefined;
          const joined = access.acceptInvite(req.body?.token, current?.id, req.body ?? {});
          if (!current) res.setHeader('Set-Cookie', cookie(access.startSession(joined.user.id)));
          res.json({ authenticated: true, mode: 'account', ...joined });
        }
      } catch (error) { next(error); }
    });
  }
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') { next(); return; }
    if (!res.locals.session) { res.status(401).json({ error: 'Sign in with the team access code.' }); return; }
    next();
  });
  app.post('/api/session/role', (req, res) => {
    if (res.locals.session.mode !== 'presenter') { res.status(403).json({ error: 'Account roles are granted per case and cannot be switched.' }); return; }
    if (!['lp', 'gp', 'buyer'].includes(req.body?.role)) { res.status(400).json({ error: 'Choose a fictional participant.' }); return; }
    res.locals.session.role = req.body.role;
    res.json({ role: res.locals.session.role });
  });
  app.post('/api/session/logout', (_req, res) => {
    sessions.delete(res.locals.sessionId); access?.logout(res.locals.sessionId); res.setHeader('Set-Cookie', cookie('', 0)); res.json({ ok: true });
  });
  app.post('/api/session/password', (req, res, next) => {
    try {
      if (!access || res.locals.session.mode !== 'account') { res.status(403).json({ error: 'Sign in to an individual account.' }); return; }
      if (Date.now() - windowStart >= 60000) { attempts = 0; windowStart = Date.now(); }
      if (++attempts > 60) { res.status(429).json({ error: 'Too many attempts. Try again in one minute.' }); return; }
      access.changePassword(res.locals.session.user.id, req.body?.currentPassword, req.body?.newPassword);
      res.setHeader('Set-Cookie', cookie(access.startSession(res.locals.session.user.id)));
      res.json({ ok: true, otherSessionsRevoked: true });
    } catch (error) { next(error); }
  });
}
