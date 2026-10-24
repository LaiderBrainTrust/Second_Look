import type { CaseView } from '../shared/contracts';
import { recipientLabel, roleLabels, statusLabel, usd } from './format';
import { CountUp } from './CountUp';

export function DealRail({ data }: { data: CaseView }) {
  const review = data.privateReview;
  const change = review?.lastTermChange;
  const before = change?.previousGrossReceiptsCents ?? null;
  const after = change?.revisedGrossReceiptsCents ?? null;
  // Difference of two server-calculated amounts, for display only.
  const delta = before !== null && after !== null ? after - before : null;

  return <aside className="rail" aria-label="The offer">
    <p className="label">{data.mode === 'user' ? 'Terms entered by the investor' : 'Example case'}</p>
    <h2 className="rail-title">{data.title}</h2>

    <dl className="terms">
      <div><dt>Purchase payment</dt><dd className="figure">{usd(data.offer.purchasePriceCents)}</dd></div>
      <div><dt>Distribution goes to</dt><dd>{recipientLabel(data.offer.distributionRecipient)}</dd></div>
      <div><dt>Offer</dt><dd>Version {data.offer.version}, case revision {data.revision}</dd></div>
    </dl>

    {review ? <>
      {change && <section className="ledger" key={change.atRevision} aria-label="Change in terms">
        <p className="label">Terms changed, offer v{change.previousOffer.version} to v{data.offer.version}</p>
        {before !== null && after !== null
          ? <>
              <div className="ledger-row"><span>Before</span><span className="figure was">{usd(before)}</span></div>
              <div className="ledger-row"><span>Now</span><span className="figure">{usd(after)}</span></div>
              <p className="delta">{delta === 0 ? 'No change to gross receipts' : `${(delta as number) < 0 ? '−' : '+'}${usd(Math.abs(delta as number))} to the seller`}</p>
            </>
          : <p className="delta">Cash effect unresolved</p>}
        <p className="fine">Purchase payment unchanged at {usd(data.offer.purchasePriceCents)}. Distribution moved from {recipientLabel(change.previousOffer.distributionRecipient)} to {recipientLabel(data.offer.distributionRecipient)}. Recorded at revision {change.atRevision}.</p>
      </section>}

      <section className="receipts" aria-live="polite" aria-label="Scenario gross receipts">
        <p className="label">Scenario gross receipts</p>
        <p className="figure large" key={`${data.revision}-${review.grossReceiptsCents}`}>
          {review.grossReceiptsCents === null ? 'Unresolved' : <CountUp cents={review.grossReceiptsCents}/>}
        </p>
        <p className="fine">
          {review.grossReceiptsCents === null
            ? 'The amount stays unresolved until the manager answers.'
            : data.offer.distributionRecipient === 'seller'
              ? 'Purchase payment plus the distribution, which the seller retains.'
              : 'Purchase payment only. The distribution goes to the buyer.'}
          {' '}Taxes, fees and timing are excluded. Price adjustment: {data.offer.priceAdjustmentCents === null ? 'not set' : usd(data.offer.priceAdjustmentCents)}.
        </p>
      </section>

      <section className="status" aria-label="Status">
        <p className="label">Status</p>
        <p className={`status-line ${review.status}${review.status === 'awaiting_answer' ? ' waiting' : ''}`}>{statusLabel[review.status]}</p>
        <p className="fine">Next: {roleLabels[data.nextOwner]}</p>
      </section>
    </> : <p className="fine">This role receives the shared question, the answer and the offer. The investor&rsquo;s private review is not sent to it.</p>}
  </aside>;
}
