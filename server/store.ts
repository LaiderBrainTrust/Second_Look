import { DatabaseSync } from 'node:sqlite';
import { applyCommand, seedCase, DomainError, type Command } from './domain.js';
import type { CaseState, Role } from '../shared/contracts.js';
import type { ResearchRun } from '../shared/research.js';

export function createStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, body TEXT NOT NULL)');
  db.prepare('INSERT OR IGNORE INTO cases (id, body) VALUES (?, ?)').run('sample-fund', JSON.stringify(seedCase()));
  db.exec('CREATE TABLE IF NOT EXISTS research_runs (id TEXT PRIMARY KEY, body TEXT NOT NULL, created_at TEXT NOT NULL)');
  function read(): CaseState {
    const row = db.prepare('SELECT body FROM cases WHERE id = ?').get('sample-fund') as { body: string };
    return JSON.parse(row.body);
  }
  function research(id: string): ResearchRun {
    const row = db.prepare('SELECT body FROM research_runs WHERE id = ?').get(id) as { body: string } | undefined;
    if (!row) throw new DomainError(404, 'Research not found.');
    return JSON.parse(row.body);
  }
  function saveResearch(run: ResearchRun) {
    db.prepare('INSERT INTO research_runs (id, body, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body').run(run.id, JSON.stringify(run), run.createdAt);
    return run;
  }
  function current(expected: number) {
    const state = read();
    if (state.revision !== expected) throw new DomainError(409, 'This case changed. Refresh and research the current version.');
    return state;
  }
  // Read-only provider fetches can be repeated; never strand a run as fetching after a crash.
  for (const row of db.prepare('SELECT body FROM research_runs').all() as { body: string }[]) {
    const run = JSON.parse(row.body) as ResearchRun;
    if (run.status === 'fetching') saveResearch({ ...run, status: 'blocked', error: 'The API restarted during research. Start a new check; no review was dispatched.' });
  }
  return {
    read,
    research, saveResearch, current,
    listResearch: (): ResearchRun[] => (db.prepare('SELECT body FROM research_runs ORDER BY created_at DESC LIMIT 30').all() as { body: string }[]).map(row => JSON.parse(row.body)),
    publishResearch(id: string, expected: number) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const run = research(id);
        if (run.acceptedRevision !== undefined) { db.exec('COMMIT'); return read(); }
        const state = current(expected);
        if (run.caseRevision !== expected || run.status !== 'done' || !run.result) throw new DomainError(409, 'Only a completed review of the current case can be shared.');
        const finding = run.findings.find(item => item.source.id === run.selectedFindingId);
        if (!finding) throw new DomainError(409, 'The reviewed source is missing.');
        state.revision++;
        state.question = run.result.question;
        state.questionSource = finding.source;
        state.answer = null;
        state.events.push({ revision: state.revision, text: 'Investor shared a source-backed question with the fund manager. A fresh answer and review are required.', at: new Date().toISOString() });
        db.prepare('UPDATE cases SET body = ? WHERE id = ?').run(JSON.stringify(state), state.id);
        run.acceptedRevision = state.revision; saveResearch(run);
        db.exec('COMMIT'); return state;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
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
