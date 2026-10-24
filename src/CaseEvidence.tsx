import type { CaseView } from '../shared/contracts';
import { api } from './api';
import { ResearchPanel } from './ResearchPanel';
import { X1Sources } from './X1Sources';

// Evidence for a case the investor entered: X1 sources, then outside research once the owner allows it.
export function CaseEvidence({ base, data, busy, refreshVersion, onChanged, onShared, onProviderChange }: {
  base: string; data: CaseView; busy: boolean; refreshVersion: number;
  onChanged: () => void; onShared: (data: CaseView) => void; onProviderChange: () => void;
}) {
  const allowed = data.privateReview?.allowExternalResearch;
  return <section aria-labelledby="evidence-heading">
    <div className="section-head"><div>
      <h2 id="evidence-heading">Evidence</h2>
      <p className="lede">Sources copied into this case from X1, and outside research on the companies behind the interest. Each item keeps its source and retrieval date.</p>
    </div></div>
    <div className="block"><X1Sources caseBase={base} revision={data.revision} onChanged={onChanged}/></div>
    {allowed
      ? <div className="block"><ResearchPanel data={data} caseBase={base} refreshVersion={refreshVersion} onShared={onShared} onProviderChange={onProviderChange}/></div>
      : <section className="block" aria-label="Outside research">
          <h3>Research outside the fund report</h3>
          <p>With your permission, selected company evidence and relevant sale terms are processed by Akta, Roundtable, Nicrron and PRISM. Your X1 credentials are never shared with them.</p>
          <button className="primary" disabled={busy} onClick={() => void api(`${base}/external-research`, { expectedRevision: data.revision, enabled: true }).then(onChanged)}>Enable outside research for this case</button>
        </section>}
  </section>;
}
