import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { Role } from '../shared/contracts.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const lifetimeMs = 8 * 60 * 60 * 1000;

// Only token hashes are stored. Code rotation invalidates prior presentation
// sessions; individual-account sessions have their own independent lifecycle.
export function createPresenterSessions(db: DatabaseSync, accessCode: string) {
  const codeHash = hash(accessCode);
  db.exec(`CREATE TABLE IF NOT EXISTS presenter_sessions (
    token_hash TEXT PRIMARY KEY, code_hash TEXT NOT NULL,
    role TEXT NOT NULL, expires INTEGER NOT NULL
  )`);
  const prune = () => db.prepare('DELETE FROM presenter_sessions WHERE expires<=? OR code_hash<>?').run(Date.now(), codeHash);
  prune();
  return {
    get(token: string) {
      const row = db.prepare('SELECT role,expires FROM presenter_sessions WHERE token_hash=? AND code_hash=? AND expires>?')
        .get(hash(token), codeHash, Date.now()) as { role: Role; expires: number } | undefined;
      return row ? { ...row, caseId: 'sample-fund', mode: 'presenter' as const } : undefined;
    },
    issue() {
      prune();
      const count = db.prepare('SELECT count(*) AS n FROM presenter_sessions').get() as { n: number };
      if (count.n >= 500) return undefined;
      const token = randomBytes(32).toString('hex');
      db.prepare('INSERT INTO presenter_sessions VALUES (?,?,?,?)').run(hash(token), codeHash, 'lp', Date.now() + lifetimeMs);
      return token;
    },
    setRole(token: string, role: Role) {
      db.prepare('UPDATE presenter_sessions SET role=? WHERE token_hash=? AND code_hash=? AND expires>?')
        .run(role, hash(token), codeHash, Date.now());
    },
    delete(token: string) { db.prepare('DELETE FROM presenter_sessions WHERE token_hash=?').run(hash(token)); },
  };
}
