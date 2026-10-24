import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { Actor, CaseState, Role } from '../shared/contracts.js';
import { DomainError, money } from './domain.js';

export interface Account { id: string; handle: string; displayName: string }
export interface AccountSession { mode: 'account'; user: Account; expires: number }
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const text = (value: unknown, name: string, max = 2000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DomainError(400, `Provide ${name} (1–${max} characters).`);
  return value.trim();
};
function handle(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(normalized)) throw new DomainError(400, 'Use a 3–60 character account handle: letters, numbers, dots, hyphens or underscores.');
  return normalized;
}
function password(value: unknown) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 256) throw new DomainError(400, 'Use a password of 12–256 characters.');
  return value;
}
function adjustment(value: unknown) {
  if (value === null) return null;
  if (typeof value === 'number' && value < 0) return -money(-value);
  return money(value);
}

export function createWorkspaceAccess(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_users (id TEXT PRIMARY KEY, handle TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workspace_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS workspace_cases (case_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workspace_members (case_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, PRIMARY KEY(case_id,user_id));
    CREATE TABLE IF NOT EXISTS workspace_invites (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, case_id TEXT NOT NULL, role TEXT NOT NULL, recipient_handle TEXT, expires INTEGER NOT NULL, accepted_by TEXT, revoked INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS workspace_requests (user_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, case_id TEXT NOT NULL, PRIMARY KEY(user_id,request_id));
    CREATE TABLE IF NOT EXISTS workspace_access_events (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, actor_id TEXT NOT NULL, kind TEXT NOT NULL, target_id TEXT NOT NULL, at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS workspace_member_user ON workspace_members(user_id);
    CREATE INDEX IF NOT EXISTS workspace_session_user ON workspace_sessions(user_id);
  `);
  function account(id: string): Account {
    const row = db.prepare('SELECT id,handle,display_name AS displayName FROM workspace_users WHERE id=?').get(id) as unknown as Account | undefined;
    if (!row) throw new DomainError(401, 'Sign in to your account.');
    return row;
  }
  function register(input: { handle?: unknown; displayName?: unknown; password?: unknown }): Account {
    const name = handle(input.handle); const displayName = text(input.displayName, 'your display name', 100); const pw = password(input.password);
    if (db.prepare('SELECT id FROM workspace_users WHERE handle=?').get(name)) throw new DomainError(409, 'That handle is unavailable. Sign in if it belongs to you.');
    const count = db.prepare('SELECT COUNT(*) AS n FROM workspace_users').get() as { n: number };
    if (count.n >= 500) throw new DomainError(503, 'Early-access account capacity reached.');
    const id = randomUUID(); const salt = randomBytes(16).toString('hex'); const hash = scryptSync(pw, salt, 64).toString('hex');
    db.prepare('INSERT INTO workspace_users VALUES (?,?,?,?,?)').run(id, name, displayName, salt, hash);
    return { id, handle: name, displayName };
  }
  function authenticate(input: { handle?: unknown; password?: unknown }): Account {
    const name = typeof input.handle === 'string' ? input.handle.trim().toLowerCase().slice(0, 60) : '';
    const pw = typeof input.password === 'string' && input.password.length <= 256 ? input.password : '';
    const row = db.prepare('SELECT id,salt,password_hash FROM workspace_users WHERE handle=?').get(name) as { id: string; salt: string; password_hash: string } | undefined;
    const hash = scryptSync(pw, row?.salt ?? 'unknown-account-constant-salt', 64);
    const expected = row ? Buffer.from(row.password_hash, 'hex') : Buffer.alloc(64);
    if (!timingSafeEqual(hash, expected) || !row) throw new DomainError(401, 'The account handle or password did not match.');
    return account(row.id);
  }
  function session(token: string): AccountSession | undefined {
    if (!token) return undefined;
    const row = db.prepare('SELECT user_id,expires FROM workspace_sessions WHERE token_hash=? AND expires>?').get(digest(token), Date.now()) as { user_id: string; expires: number } | undefined;
    return row ? { mode: 'account', user: account(row.user_id), expires: row.expires } : undefined;
  }
  function startSession(userId: string) {
    db.prepare('DELETE FROM workspace_sessions WHERE expires<=?').run(Date.now());
    const count = db.prepare('SELECT COUNT(*) AS n FROM workspace_sessions WHERE user_id=?').get(userId) as { n: number };
    if (count.n >= 100) throw new DomainError(429, 'Too many active sessions. Sign out of another device first.');
    const token = secret(); db.prepare('INSERT INTO workspace_sessions VALUES (?,?,?)').run(digest(token), userId, Date.now() + 8 * 60 * 60 * 1000);
    return token;
  }
  function membership(caseId: string, userId: string): Actor {
    const row = db.prepare('SELECT role FROM workspace_members WHERE case_id=? AND user_id=?').get(caseId, userId) as { role: Role } | undefined;
    if (!row) throw new DomainError(404, 'Case not found.');
    return { userId, displayName: account(userId).displayName, role: row.role };
  }
  function requireOwner(caseId: string, userId: string) {
    const row = db.prepare('SELECT owner_id FROM workspace_cases WHERE case_id=?').get(caseId) as { owner_id: string } | undefined;
    if (!row || row.owner_id !== userId) throw new DomainError(404, 'Case not found for this owner.');
  }
  function transaction<T>(fn: () => T): T {
    db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  function audit(caseId: string, actorId: string, kind: string, targetId: string) {
    db.prepare('INSERT INTO workspace_access_events VALUES (?,?,?,?,?,?)').run(randomUUID(), caseId, actorId, kind, targetId, new Date().toISOString());
  }
  function createCase(userId: string, input: Record<string, unknown>) {
    const owner = account(userId);
    if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(input.requestId)) throw new DomainError(400, 'Provide a stable case-creation requestId of 8–100 letters, numbers, hyphens or underscores.');
    if (typeof input.allowExternalResearch !== 'boolean') throw new DomainError(400, 'Explicitly choose whether this case may use external research services.');
    if (input.distributionRecipient !== null && !['seller', 'buyer'].includes(String(input.distributionRecipient))) throw new DomainError(400, 'Choose who keeps the fund payout, or not confirmed yet.');
    const caseId = randomUUID(); const at = new Date().toISOString();
    const state: CaseState = {
      id: caseId, mode: 'user', allowExternalResearch: input.allowExternalResearch,
      title: text(input.title, 'case title', 200), ownerEntity: text(input.ownerEntity, 'owner or entity', 200), revision: 1,
      report: { id: randomUUID(), kind: 'user', label: input.reportNote == null ? 'No report reference supplied' : text(input.reportNote, 'report reference') },
      offer: { version: 1, currency: 'USD', purchasePriceCents: money(input.purchasePriceCents), priceAdjustmentCents: adjustment(input.priceAdjustmentCents), distributionRecipient: input.distributionRecipient as 'seller' | 'buyer' | null, source: { id: randomUUID(), kind: 'user', label: text(input.offerNote, 'offer source reference') } },
      question: text(input.question, 'initial manager question'), answer: null, reviews: [],
      events: [{ revision: 1, at, text: 'Investor created this case from entered terms and source references. No document was parsed or independently verified.', actor: { userId, displayName: owner.displayName, role: 'lp' } }],
    };
    const fingerprint = digest(JSON.stringify([state.title, state.ownerEntity, state.report.label, state.offer.purchasePriceCents, state.offer.priceAdjustmentCents, state.offer.distributionRecipient, state.offer.source.label, state.question, state.allowExternalResearch]));
    return transaction(() => {
      const prior = db.prepare('SELECT fingerprint,case_id FROM workspace_requests WHERE user_id=? AND request_id=?').get(userId, input.requestId as string) as { fingerprint: string; case_id: string } | undefined;
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new DomainError(409, 'This requestId was already used with different case details.');
        return JSON.parse((db.prepare('SELECT body FROM cases WHERE id=?').get(prior.case_id) as { body: string }).body) as CaseState;
      }
      const count = db.prepare('SELECT COUNT(*) AS n FROM workspace_cases WHERE owner_id=?').get(userId) as { n: number };
      if (count.n >= 50) throw new DomainError(422, 'This early-access account supports up to 50 cases.');
      db.prepare('INSERT INTO cases VALUES (?,?)').run(caseId, JSON.stringify(state));
      db.prepare('INSERT INTO workspace_cases VALUES (?,?,?)').run(caseId, userId, at);
      db.prepare('INSERT INTO workspace_members VALUES (?,?,?)').run(caseId, userId, 'lp');
      db.prepare('INSERT INTO workspace_requests VALUES (?,?,?,?)').run(userId, input.requestId as string, fingerprint, caseId);
      audit(caseId, userId, 'case_created', caseId);
      return state;
    });
  }
  function invite(caseId: string, userId: string, input: Record<string, unknown>) {
    requireOwner(caseId, userId);
    if (!['gp', 'buyer'].includes(String(input.role))) throw new DomainError(400, 'Invite a fund manager or buyer. Investor access belongs to the case creator.');
    const recipient = input.recipientHandle == null ? null : handle(input.recipientHandle);
    const n = db.prepare('SELECT COUNT(*) AS n FROM workspace_invites WHERE case_id=? AND accepted_by IS NULL AND revoked=0 AND expires>?').get(caseId, Date.now()) as { n: number };
    if (n.n >= 20) throw new DomainError(422, 'Revoke an unused invitation before creating another.');
    const token = secret(); const id = randomUUID(); const expires = Date.now() + 24 * 60 * 60 * 1000;
    transaction(() => {
      db.prepare('INSERT INTO workspace_invites(id,token_hash,case_id,role,recipient_handle,expires) VALUES (?,?,?,?,?,?)').run(id, digest(token), caseId, String(input.role), recipient, expires);
      audit(caseId, userId, 'invitation_created', id);
    });
    return { id, token, expiresAt: new Date(expires).toISOString(), role: input.role, recipientHandle: recipient };
  }
  function acceptInvite(token: unknown, userId: string | undefined, input: Record<string, unknown>) {
    if (typeof token !== 'string' || token.length > 100) throw new DomainError(400, 'Provide an invitation token.');
    return transaction(() => {
      const row = db.prepare('SELECT * FROM workspace_invites WHERE token_hash=? AND revoked=0 AND accepted_by IS NULL AND expires>?').get(digest(token), Date.now()) as { id: string; case_id: string; role: Role; recipient_handle: string | null } | undefined;
      if (!row) throw new DomainError(410, 'This invitation is expired, revoked or already used. Request a new one.');
      const user = userId ? account(userId) : register(input);
      if (row.recipient_handle && row.recipient_handle !== user.handle) throw new DomainError(403, 'This invitation is restricted to a different account handle.');
      if (db.prepare('SELECT role FROM workspace_members WHERE case_id=? AND user_id=?').get(row.case_id, user.id)) throw new DomainError(409, 'This account already participates in that case. Existing permissions were not changed.');
      db.prepare('INSERT INTO workspace_members VALUES (?,?,?)').run(row.case_id, user.id, row.role);
      db.prepare('UPDATE workspace_invites SET accepted_by=? WHERE id=?').run(user.id, row.id);
      audit(row.case_id, user.id, 'invitation_accepted', row.id);
      return { user, caseId: row.case_id, role: row.role };
    });
  }
  return {
    register, authenticate, session, startSession, membership, requireOwner, createCase, invite, acceptInvite,
    logout(token: string) { db.prepare('DELETE FROM workspace_sessions WHERE token_hash=?').run(digest(token)); },
    changePassword(userId: string, currentPassword: unknown, nextPassword: unknown) {
      const user = account(userId);
      authenticate({ handle: user.handle, password: currentPassword });
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(password(nextPassword), salt, 64).toString('hex');
      transaction(() => {
        db.prepare('UPDATE workspace_users SET salt=?,password_hash=? WHERE id=?').run(salt, hash, userId);
        db.prepare('DELETE FROM workspace_sessions WHERE user_id=?').run(userId);
      });
    },
    listCases(userId: string) {
      return db.prepare("SELECT c.id, json_extract(c.body,'$.title') AS title, json_extract(c.body,'$.revision') AS revision, m.role FROM cases c JOIN workspace_members m ON m.case_id=c.id WHERE m.user_id=? ORDER BY c.rowid DESC").all(userId);
    },
    members(caseId: string, userId: string) {
      requireOwner(caseId, userId);
      return db.prepare('SELECT u.id,u.handle,u.display_name AS displayName,m.role FROM workspace_members m JOIN workspace_users u ON u.id=m.user_id WHERE m.case_id=?').all(caseId);
    },
    accessEvents(caseId: string, userId: string) {
      requireOwner(caseId, userId);
      return db.prepare('SELECT actor_id AS actorId,kind,target_id AS targetId,at FROM workspace_access_events WHERE case_id=? ORDER BY rowid DESC LIMIT 200').all(caseId);
    },
    researchConsent(caseId: string, userId: string, expected: number, enabled: unknown) {
      requireOwner(caseId, userId);
      if (typeof enabled !== 'boolean') throw new DomainError(400, 'Explicitly enable or disable external research.');
      return transaction(() => {
        const row = db.prepare('SELECT body FROM cases WHERE id=?').get(caseId) as { body: string };
        const state = JSON.parse(row.body) as CaseState;
        if (state.revision !== expected) throw new DomainError(409, 'This case changed. Refresh before changing external research permission.');
        state.revision++; state.allowExternalResearch = enabled;
        state.events.push({ revision: state.revision, at: new Date().toISOString(), text: enabled ? 'Investor allowed external sponsor research processing for this case.' : 'Investor disabled new external research requests. Previously dispatched work and provider records are not erased.', actor: { userId, displayName: account(userId).displayName, role: 'lp' } });
        db.prepare('UPDATE cases SET body=? WHERE id=?').run(JSON.stringify(state), caseId);
        return state;
      });
    },
    invitations(caseId: string, userId: string) {
      requireOwner(caseId, userId);
      return db.prepare('SELECT id,role,recipient_handle AS recipientHandle,expires,accepted_by AS acceptedBy,revoked FROM workspace_invites WHERE case_id=? ORDER BY rowid DESC LIMIT 100').all(caseId);
    },
    revokeInvite(caseId: string, userId: string, inviteId: string) {
      requireOwner(caseId, userId);
      transaction(() => {
        db.prepare('UPDATE workspace_invites SET revoked=1 WHERE case_id=? AND id=?').run(caseId, inviteId);
        audit(caseId, userId, 'invitation_revoked', inviteId);
      });
    },
    revokeMember(caseId: string, userId: string, memberId: string) {
      requireOwner(caseId, userId);
      if (memberId === userId) throw new DomainError(400, 'The case owner cannot revoke their own access.');
      transaction(() => {
        db.prepare('DELETE FROM workspace_members WHERE case_id=? AND user_id=?').run(caseId, memberId);
        audit(caseId, userId, 'member_revoked', memberId);
      });
    },
  };
}
export type WorkspaceAccess = ReturnType<typeof createWorkspaceAccess>;
