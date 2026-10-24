import { DatabaseSync } from 'node:sqlite';
import { applyCommand, seedCase, type Command } from './domain.js';
import type { CaseState, Role } from '../shared/contracts.js';

export function createStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, body TEXT NOT NULL)');
  db.prepare('INSERT OR IGNORE INTO cases (id, body) VALUES (?, ?)').run('sample-fund', JSON.stringify(seedCase()));
  function read(): CaseState {
    const row = db.prepare('SELECT body FROM cases WHERE id = ?').get('sample-fund') as { body: string };
    return JSON.parse(row.body);
  }
  return {
    read,
    command(role: Role, expected: number, command: Command) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const next = applyCommand(read(), role, expected, command);
        db.prepare('UPDATE cases SET body = ? WHERE id = ?').run(JSON.stringify(next), next.id);
        db.exec('COMMIT');
        return next;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close: () => db.close(),
  };
}
