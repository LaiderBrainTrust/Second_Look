import type { CaseView } from '../shared/contracts';
import { recipientLabel, statusLabel, usd } from './format';

export interface NextStep { label: string; onSelect: () => void }

// Opening block: the case, the offer as the server holds it, and the next useful action.
export function Hero({ data, next }: { data: CaseView; next: NextStep | null }) {
  const status = data.privateReview?.status;
  return <section className="hero" aria-labelledby="hero-title">
    <p className="eyebrow">{data.mode === 'user' ? 'Terms entered by the investor' : 'Illustrative fund and deal'}</p>
    <div className="hero-top">
      <h1 id="hero-title">Know what you are selling.</h1>
      <p className="hero-sub">Outside evidence on the fund&rsquo;s holdings, the manager&rsquo;s answer, and the exact terms you approved, kept together.</p>
    </div>
    <div className="hero-block">
      <div className="hero-fund">
        <span className="label">Fund interest</span>
        <strong>{data.title}</strong>
        {status && <span className="hero-status">{statusLabel[status]}</span>}
      </div>
      <dl className="hero-figures">
        <div><dt>Purchase payment</dt><dd className="figure">{usd(data.offer.purchasePriceCents)}</dd></div>
        <div><dt>Distribution goes to</dt><dd className="figure">{recipientLabel(data.offer.distributionRecipient)}</dd></div>
        <div><dt>Offer</dt><dd className="figure">v{data.offer.version}</dd></div>
      </dl>
      {next && <button className="cta" onClick={next.onSelect}>{next.label}</button>}
    </div>
  </section>;
}
