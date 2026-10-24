import type { ResearchRun } from "../shared/research";

export type GameSelection = { holdingId: string; snapshotId: string };
export function matchingResearch(runs: ResearchRun[], revision: number, selection?: GameSelection | null) {
  return runs.filter(run => run.caseRevision === revision && (!selection || (
    run.gamingContext?.holding.id === selection.holdingId && run.gamingContext.snapshotId === selection.snapshotId
  )));
}

export function ResearchProposal({ run }: { run: ResearchRun }) {
  if (!run.result) return null;
  const finding = run.findings.find(f => f.source.id === run.result!.findingId);
  const steam = run.gamingContext?.steam;
  return <div className="research-proposal">
    <div className="research-proposal-evidence">
      <h4>The evidence behind this question</h4>
      {finding ? <>
        <p>{finding.claim}</p>
        <p className="muted">Published or observed {new Date(finding.publishedAt).toLocaleString()}. Retrieved {new Date(finding.retrievedAt).toLocaleString()}.</p>
        {finding.source.url && <a href={finding.source.url} target="_blank" rel="noreferrer">Read {finding.source.label} ↗</a>}
      </> : <p>The selected source is unavailable in this saved result.</p>}
      {run.coverage && <p className="muted">{run.coverage}</p>}
      {steam && <p className="muted">{steam.baseline.count} earlier and {steam.current.count} later English reviews sampled. {steam.deltaPoints === null ? "Too few reviews to establish a comparable change." : steam.deltaPoints >= 0 ? "This sample does not show a decline in positive reviews." : "This sample shows a decline in positive reviews, not a forecast of sales or fund payouts."} Player counts are point-in-time observations.</p>}
      {run.gamingContext && !run.gamingContext.news.length && <p className="muted">No company news articles saved in this run. This does not establish that no news exists.</p>}
    </div>
    <div>
      <h4>The proposed question</h4>
      <blockquote>{run.result.question}</blockquote>
      <h4>Why ask it before selling?</h4>
      <p>{run.result.explanation}</p>
      <p className="muted">The fund contact supplies the payout amount. The sale terms determine who receives it. Player activity alone cannot establish either.</p>
    </div>
  </div>;
}

export function SponsorProof({ run }: { run: ResearchRun }) {
  const result = run.result;
  const profile = run.gamingContext?.profile;
  const news = run.gamingContext?.news ?? run.findings.filter(f => !f.source.id.startsWith("steam:"));
  return <details className="sponsor-proof">
    <summary>How the four sponsors contributed to this saved result</summary>
    <p className="muted">Saved run started {new Date(run.createdAt).toLocaleString()}. These are this run’s receipts, not the current connection status.</p>
    <dl>
      <dt>Akta: company context</dt>
      <dd>{profile ? `${profile.name} company profile, retrieved ${new Date(profile.retrievedAt).toLocaleString()}.` : "No company profile receipt saved."} {news.length ? `${news.length} company news source${news.length === 1 ? "" : "s"} saved.` : "No company news receipt saved; a successful Akta news call is not established here."}
        {profile && <details><summary>Saved company profile</summary><p>{profile.description}</p></details>}
        {news.length > 0 && <ul>{news.map(f => <li key={f.source.id}>{f.source.url ? <a href={f.source.url} target="_blank" rel="noreferrer">{f.source.label}</a> : f.source.label} · retrieved {new Date(f.retrievedAt).toLocaleString()}</li>)}</ul>}
      </dd>
      <dt>Roundtable: versioned reviewer task</dt>
      <dd>{run.taskId && run.inputSource ? "Task and input version saved." : "No complete task and input receipt saved."}
        <details><summary>Task and document versions</summary><p>Task: {run.taskId ?? "Not recorded"}</p>
          {run.inputSource && <p>Input: {run.inputSource.path} @ {run.inputSource.version}</p>}
          <ul>{result?.sources.map(s => <li key={`${s.bank}:${s.path}:${s.version}`}>{s.path} @ {s.version}</li>)}</ul>
        </details>
      </dd>
      <dt>Nicrron: question draft</dt>
      <dd>{result?.method === "nicrron" ? `Drafted through Nicrron. Model: ${result.model ?? "not recorded"}.` : result?.method === "rule-based" ? "Rule-based draft. Nicrron was not used for this result." : "No completed draft receipt saved."}
        {result?.method === "nicrron" && result.modelRequestId && <details><summary>Model request receipt</summary><p>{result.modelRequestId}</p></details>}
      </dd>
      <dt>PRISM: model-call trace</dt>
      <dd>{result?.trace?.status === "recorded" && result.trace.id ? "Trace recorded." : result?.trace?.status === "failed" ? "Trace failed." : result?.trace?.status === "not_configured" ? "Trace was not configured." : "No complete trace receipt saved."}
        {result?.trace?.status === "recorded" && result.trace.id && <details><summary>Saved trace receipt</summary><p>{result.trace.id}</p></details>}
      </dd>
    </dl>
  </details>;
}
