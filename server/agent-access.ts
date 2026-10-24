import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { WorkspaceAccess } from './workspace-access.js';
import { DomainError } from './domain.js';

const hash = (v: string) => createHash('sha256').update(v).digest('hex');
export function createAgentAccess(db: DatabaseSync, access: WorkspaceAccess) {
  db.exec(`CREATE TABLE IF NOT EXISTS agent_keys (
    id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, case_id TEXT NOT NULL,
    user_id TEXT NOT NULL, label TEXT NOT NULL, scope TEXT NOT NULL,
    expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0,
    credential_hash TEXT NOT NULL, revocation_epoch INTEGER NOT NULL
  )`);
  const epoch = (caseId: string, userId: string) => (db.prepare("SELECT COUNT(*) AS n FROM workspace_access_events WHERE case_id=? AND target_id=? AND kind='member_revoked'").get(caseId, userId) as { n: number }).n;
  const credential = (userId: string) => (db.prepare('SELECT password_hash FROM workspace_users WHERE id=?').get(userId) as { password_hash: string }).password_hash;
  return {
    issue(caseId: string, userId: string, label: unknown, scope: unknown) {
      access.membership(caseId, userId);
      if (typeof label !== 'string' || !label.trim() || label.length > 100 || !['read', 'work'].includes(String(scope))) throw new DomainError(400, 'Provide an agent label and read or work scope.');
      const count = (db.prepare('SELECT COUNT(*) AS n FROM agent_keys WHERE user_id=? AND revoked=0 AND expires>?').get(userId, Date.now()) as { n: number }).n;
      if (count >= 20) throw new DomainError(422, 'Revoke an unused agent key before creating another.');
      const id = randomUUID(), token = randomBytes(32).toString('base64url'), expires = Date.now() + 86400000;
      db.prepare('INSERT INTO agent_keys VALUES (?,?,?,?,?,?,?,0,?,?)').run(id, hash(token), caseId, userId, label.trim(), String(scope), expires, credential(userId), epoch(caseId, userId));
      return { id, token, caseId, label: label.trim(), scope, expiresAt: new Date(expires).toISOString() };
    },
    authenticate(token: string) {
      const row = db.prepare('SELECT id,case_id,user_id,scope,credential_hash,revocation_epoch FROM agent_keys WHERE token_hash=? AND revoked=0 AND expires>?').get(hash(token), Date.now()) as { id: string; case_id: string; user_id: string; scope: 'read' | 'work'; credential_hash: string; revocation_epoch: number } | undefined;
      if (!row || credential(row.user_id) !== row.credential_hash || epoch(row.case_id, row.user_id) !== row.revocation_epoch) throw new DomainError(401, 'Agent key expired or revoked. Create a new case connection.');
      const actor = access.membership(row.case_id, row.user_id);
      return { id: row.id, caseId: row.case_id, scope: row.scope, actor: { ...actor, agentKeyId: row.id } };
    },
    list(caseId: string, userId: string) {
      access.membership(caseId, userId);
      return db.prepare('SELECT id,label,scope,expires,revoked FROM agent_keys WHERE case_id=? AND user_id=? ORDER BY rowid DESC LIMIT 100').all(caseId, userId);
    },
    revoke(caseId: string, userId: string, id: string) {
      access.membership(caseId, userId);
      db.prepare('UPDATE agent_keys SET revoked=1 WHERE id=? AND case_id=? AND user_id=?').run(id, caseId, userId);
    },
  };
}
export type AgentAccess = ReturnType<typeof createAgentAccess>;
