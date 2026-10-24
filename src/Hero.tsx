import type { CaseView } from '../shared/contracts';
import { recipientLabel, statusLabel } from './format';
import { CountUp } from './CountUp';
import { Burst } from './Burst';

export interface NextStep { label: string; onSelect: () => void }

// Opening block: the case, the offer as the server holds it, and the next useful action.
export function Hero({ data, next }: { data: CaseView; next: NextStep | null }) {
  const status = data.privateReview?.status;
  return <section className="hero" aria-labelledby="hero-title">
    <p className="eyebrow">{data.mode === 'user' ? 'Terms entered by the investor' : 'Illustrative fund and deal'}</p>
    <div className="hero-top">
      <h1 id="hero-title">Review of a proposed secondary sale</h1>
      <p className="hero-sub">Evidence on the fund&rsquo;s holdings, the manager&rsquo;s response, and the offer terms under review, recorded by version.</p>
    </div>
    <div className="hero-block">
      <div className="hero-fund"><Burst variant={1}/>
        <span className="label">Fund interest</span>
        <strong>{data.title}</strong>
        {status && <span className="hero-status">{statusLabel[status]}</span>}
      </div>
      <dl className="hero-figures">
        <div><dt>Purchase payment</dt><dd className="figure"><CountUp cents={data.offer.purchasePriceCents}/></dd></div>
        <div><dt>Distribution goes to</dt><dd className="figure">{recipientLabel(data.offer.distributionRecipient)}</dd></div>
        <div><dt>Offer</dt><dd className="figure">v{data.offer.version}</dd></div>
      </dl>
      {next && <button className="cta" onClick={next.onSelect}>{next.label}</button>}
    </div>
  </section>;
}
