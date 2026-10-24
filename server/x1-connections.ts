import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { DomainError } from './domain.js';

// Credentials are bound to the signed-in owner AND selected case. Never exported
// through case views, research jobs, traces, MCP tools or connection metadata.
export function createX1Connections(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS x1_connections (
    case_id TEXT NOT NULL, user_id TEXT NOT NULL, version TEXT NOT NULL,
    ciphertext TEXT NOT NULL, connected_at TEXT NOT NULL,
    PRIMARY KEY(case_id,user_id)
  )`);
  function encryptionKey() {
    const value = process.env.X1_CONNECTION_ENCRYPTION_KEY;
    if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new DomainError(503, 'Individual X1 connections are not enabled on this server yet.');
    return Buffer.from(value, 'hex');
  }
  const ready = () => /^[a-f0-9]{64}$/i.test(process.env.X1_CONNECTION_ENCRYPTION_KEY ?? '');
  function metadata(caseId: string, userId: string) {
    return db.prepare('SELECT version,connected_at AS connectedAt FROM x1_connections WHERE case_id=? AND user_id=?').get(caseId, userId) as { version: string; connectedAt: string } | undefined;
  }
  function save(caseId: string, userId: string, key: string) {
    const version = randomUUID(); const connectedAt = new Date().toISOString();
    const nonce = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce);
    cipher.setAAD(Buffer.from(JSON.stringify([caseId, userId, version])));
    const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
    const ciphertext = Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64');
    db.prepare('INSERT INTO x1_connections VALUES (?,?,?,?,?) ON CONFLICT(case_id,user_id) DO UPDATE SET version=excluded.version,ciphertext=excluded.ciphertext,connected_at=excluded.connected_at').run(caseId, userId, version, ciphertext, connectedAt);
    return { version, connectedAt };
  }
  function read(caseId: string, userId: string) {
    const row = db.prepare('SELECT version,ciphertext FROM x1_connections WHERE case_id=? AND user_id=?').get(caseId, userId) as { version: string; ciphertext: string } | undefined;
    if (!row) throw new DomainError(409, 'Connect your X1 account for this case first.');
    const masterKey = encryptionKey();
    try {
      const data = Buffer.from(row.ciphertext, 'base64');
      const decipher = createDecipheriv('aes-256-gcm', masterKey, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(12, 28));
      decipher.setAAD(Buffer.from(JSON.stringify([caseId, userId, row.version])));
      return { version: row.version, key: Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8') };
    } catch { throw new DomainError(503, 'The saved X1 connection cannot be opened. Reconnect your account.'); }
  }
  return { ready, metadata, save, read, disconnect(caseId: string, userId: string) {
    db.prepare('DELETE FROM x1_connections WHERE case_id=? AND user_id=?').run(caseId, userId);
  } };
}
export type X1Connections = ReturnType<typeof createX1Connections>;
