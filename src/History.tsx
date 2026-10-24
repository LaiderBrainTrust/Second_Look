import type { CaseView } from '../shared/contracts';
import { dateTime } from './format';

export function History({ data, base }: { data: CaseView; base: string }) {
  const review = data.privateReview!;
  return <section aria-labelledby="history-heading">
    <div className="section-head"><div>
      <h2 id="history-heading">Decision record</h2>
      <p className="lede">What was asked, what was answered, and which version each approval applied to. Saved in the application database and kept across a reload or restart.</p>
    </div>
      <div className="row no-print">
        <a className="button-link" href={`${base}/decision-record?format=html&revision=${data.revision}`} target="_blank" rel="noreferrer">Open the decision record</a>
        <button className="secondary" onClick={() => window.print()}>Print this page</button>
      </div>
    </div>

    <h3>Events</h3>
    {review.events.length
      ? <ol className="events">{review.events.map(event => <li key={event.revision}><span className="label">Revision {event.revision}, {dateTime(event.at)}</span>{event.text}</li>)}</ol>
      : <p className="muted">No responses or revisions yet. View as the fund manager to begin.</p>}

    <h3>Approvals</h3>
    {review.reviews.length
      ? review.reviews.map(approval => {
          const current = approval.revision === data.revision;
          return <article className="approval" key={approval.revision}>
            <header><strong>Approved at revision {approval.revision}</strong><span className={`badge ${current ? 'strong' : ''}`}>{current ? 'Current version' : 'Historical, does not approve the current version'}</span></header>
            <p>{approval.responseText}</p>
            {approval.researchContext && <p className="fine">Research: {approval.researchContext.game}, {approval.researchContext.studio}</p>}
            {approval.question && <p><span className="label">Question reviewed</span>{approval.question}</p>}
            {approval.answer && <p><span className="label">Answer reviewed</span>{approval.answer.text}</p>}
            <p className="fine">{dateTime(approval.approvedAt)}</p>
          </article>;
        })
      : <p className="muted">No approvals recorded.</p>}
  </section>;
}
