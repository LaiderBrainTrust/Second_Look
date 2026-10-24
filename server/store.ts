import { DatabaseSync } from 'node:sqlite';
import { applyCommand, seedCase, DomainError, type Command } from './domain.js';
import type { Actor, CaseState, Role } from '../shared/contracts.js';
import type { GamingSnapshot, GamingHolding } from '../shared/gaming.js';
import type { ResearchRun } from '../shared/research.js';
import type { DiligenceCommand } from '../shared/diligence.js';
import { applyDiligence } from './diligence.js';

export interface CaseStore {
  read(): CaseState;
  current(expected: number): CaseState;
  research(id: string): ResearchRun;
  saveResearch(run: ResearchRun): ResearchRun;
  gaming(id: string): GamingSnapshot;
  saveGaming(snapshot: GamingSnapshot): GamingSnapshot;
  latestGaming(): GamingSnapshot | null;
  latestUsableGaming(): GamingSnapshot | null;
  queuedResearch(): ResearchRun[];
  listResearch(): ResearchRun[];
  publishResearch(id: string, expected: number, actor?: Actor): CaseState;
  command(role: Role, expected: number, command: Command, actor?: Actor): CaseState;
  diligenceCommand(role: Role, expected: number, command: DiligenceCommand, actor?: Actor): CaseState;
  close(): void;
}

function stamp(next: CaseState, previous: CaseState, actor?: Actor) {
  if (!actor) return;
  if (next.revision > previous.revision) next.events[next.events.length - 1].actor = actor;
  if (next.reviews.length > previous.reviews.length) next.reviews[next.reviews.length - 1].actor = actor;
  if (next.diligence && next.diligence.history.length > (previous.diligence?.history.length ?? 0)) {
    next.diligence.history[next.diligence.history.length - 1].actor = actor;
  }
}

// Read older demo snapshots without changing their evidence or deleting history.
function holdingFromStorage(raw: GamingHolding & { exposurePercent?: number }): GamingHolding {
  const { exposurePercent, ...holding } = raw;
  const value = holding.fundNavExposurePercent ?? exposurePercent;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new DomainError(500, 'Saved fictional exposure is missing. Fetch a new evidence snapshot.');
  return { ...holding, fundNavExposurePercent: value };
}
function gamingFromStorage(body: string): GamingSnapshot {
  const snapshot = JSON.parse(body) as GamingSnapshot;
  return { ...snapshot, holdings: snapshot.holdings.map(item => ({ ...item, holding: holdingFromStorage(item.holding) })) };
}
function researchFromStorage(body: string): ResearchRun {
  const run = JSON.parse(body) as ResearchRun;
  if (run.gamingContext) run.gamingContext.holding = holdingFromStorage(run.gamingContext.holding);
  return run;
}
export function createStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, body TEXT NOT NULL)');
  db.prepare('INSERT OR IGNORE INTO cases (id, body) VALUES (?, ?)').run('sample-fund', JSON.stringify(seedCase()));
  db.exec('CREATE TABLE IF NOT EXISTS research_runs (id TEXT PRIMARY KEY, body TEXT NOT NULL, created_at TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS gaming_snapshots (id TEXT PRIMARY KEY, body TEXT NOT NULL, created_at TEXT NOT NULL)');
  // Startup recovery runs once, not whenever a request obtains a case scope.
  for (const table of ['gaming_snapshots', 'research_runs']) {
    for (const row of db.prepare(`SELECT id, body FROM ${table}`).all() as { id: string; body: string }[]) {
      const item = JSON.parse(row.body);
      if (item.status === 'fetching') db.prepare(`UPDATE ${table} SET body = ? WHERE id = ?`).run(JSON.stringify({ ...item, status: 'blocked', error: 'The server restarted during research. Start a new evidence check.' }), row.id);
    }
  }
  function scoped(caseId: string): CaseStore {
  function saveGaming(snapshot: GamingSnapshot) {
    if (caseId !== 'sample-fund') throw new DomainError(403, 'The prepared gaming catalog belongs only to the example case.');
    db.prepare('INSERT INTO gaming_snapshots (id, body, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body').run(snapshot.id, JSON.stringify(snapshot), snapshot.createdAt);
    return snapshot;
  }
  function gaming(id: string): GamingSnapshot {
    if (caseId !== 'sample-fund') throw new DomainError(404, 'Gaming evidence not found.');
    const row = db.prepare('SELECT body FROM gaming_snapshots WHERE id = ?').get(id) as { body: string } | undefined;
    if (!row) throw new DomainError(404, 'Gaming evidence not found.');
    return gamingFromStorage(row.body);
  }
  function read(): CaseState {
    const row = db.prepare('SELECT body FROM cases WHERE id = ?').get(caseId) as { body: string } | undefined;
    if (!row) throw new DomainError(404, 'Case not found.');
    return JSON.parse(row.body);
  }
  function research(id: string): ResearchRun {
    const row = db.prepare('SELECT body FROM research_runs WHERE id = ?').get(id) as { body: string } | undefined;
    if (!row) throw new DomainError(404, 'Research not found.');
    const run = researchFromStorage(row.body);
    if (run.caseId !== caseId) throw new DomainError(404, 'Research not found.');
    return run;
  }
  function saveResearch(run: ResearchRun) {
    if (run.caseId !== caseId) throw new DomainError(403, 'Research belongs to a different case.');
    const existing = db.prepare('SELECT body FROM research_runs WHERE id = ?').get(run.id) as { body: string } | undefined;
    if (existing && JSON.parse(existing.body).caseId !== caseId) throw new DomainError(403, 'Research belongs to a different case.');
    db.prepare('INSERT INTO research_runs (id, body, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body').run(run.id, JSON.stringify(run), run.createdAt);
    return run;
  }
  function current(expected: number) {
    const state = read();
    if (state.revision !== expected) throw new DomainError(409, 'This case changed. Refresh and research the current version.');
    return state;
  }
  return {
    read,
    research, saveResearch, current, gaming, saveGaming,
    latestGaming: (): GamingSnapshot | null => {
      if (caseId !== 'sample-fund') return null;
      const row = db.prepare('SELECT body FROM gaming_snapshots ORDER BY created_at DESC LIMIT 1').get() as { body: string } | undefined;
      return row ? gamingFromStorage(row.body) : null;
    },
    latestUsableGaming: (): GamingSnapshot | null => {
      if (caseId !== 'sample-fund') return null;
      for (const row of db.prepare('SELECT body FROM gaming_snapshots ORDER BY created_at DESC').all() as { body: string }[]) {
        const snapshot = gamingFromStorage(row.body);
        if (snapshot.status === 'ready' && snapshot.holdings.some(item => item.steam || item.news.length)) return snapshot;
      }
      return null;
    },
    queuedResearch: (): ResearchRun[] => (db.prepare("SELECT body FROM research_runs WHERE json_extract(body, '$.status') = 'queued' AND json_extract(body, '$.taskId') IS NOT NULL AND json_extract(body, '$.caseId') = ? ORDER BY created_at ASC").all(caseId) as { body: string }[]).map(row => researchFromStorage(row.body)),
    listResearch: (): ResearchRun[] => (db.prepare("SELECT body FROM research_runs WHERE json_extract(body, '$.caseId') = ? ORDER BY created_at DESC LIMIT 30").all(caseId) as { body: string }[]).map(row => researchFromStorage(row.body)),
    publishResearch(id: string, expected: number, actor?: Actor) {
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
        state.researchContext = run.gamingContext ? {
          runId: run.id, snapshotId: run.gamingContext.snapshotId,
          game: run.gamingContext.holding.game, studio: run.gamingContext.holding.studio,
          sharedAtRevision: state.revision,
        } : undefined;
        state.answer = null;
        state.events.push({ revision: state.revision, text: 'Investor shared a source-backed question with the fund manager. A fresh answer and review are required.', at: new Date().toISOString(), ...(actor ? { actor } : {}) });
        db.prepare('UPDATE cases SET body = ? WHERE id = ?').run(JSON.stringify(state), state.id);
        run.acceptedRevision = state.revision; saveResearch(run);
        db.exec('COMMIT'); return state;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    command(role: Role, expected: number, command: Command, actor?: Actor) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const previous = read();
        const next = applyCommand(previous, role, expected, command);
        stamp(next, previous, actor);
        db.prepare('UPDATE cases SET body = ? WHERE id = ?').run(JSON.stringify(next), next.id);
        db.exec('COMMIT');
        return next;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    diligenceCommand(role: Role, expected: number, command: DiligenceCommand, actor?: Actor) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const previous = read();
        const next = applyDiligence(previous, role, expected, command);
        stamp(next, previous, actor);
        db.prepare('UPDATE cases SET body = ? WHERE id = ?').run(JSON.stringify(next), next.id);
        db.exec('COMMIT');
        return next;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close: () => {},
  };
  }
  const example = scoped('sample-fund');
  // This unrestricted facade is only used by the process-owned recovery worker.
  const recoveryStore: CaseStore = {
    ...example,
    research(id) {
      const row = db.prepare('SELECT body FROM research_runs WHERE id = ?').get(id) as { body: string } | undefined;
      if (!row) throw new DomainError(404, 'Research not found.');
      return researchFromStorage(row.body);
    },
    saveResearch(run) { return scoped(run.caseId).saveResearch(run); },
    queuedResearch: () => (db.prepare("SELECT body FROM research_runs WHERE json_extract(body, '$.status') = 'queued' AND json_extract(body, '$.taskId') IS NOT NULL ORDER BY created_at ASC").all() as { body: string }[]).map(row => researchFromStorage(row.body)),
  };
  return { ...example, db, forCase: scoped, recoveryStore, close: () => db.close() };
}
