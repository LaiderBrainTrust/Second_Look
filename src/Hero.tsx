import type { CaseView } from '../shared/contracts';
import { recipientLabel, statusLabel } from './format';
import { CountUp } from './CountUp';

export interface NextStep { label: string; onSelect: () => void }

const steps = [
  { title: 'Outside evidence', text: 'Recent player reviews and player counts from Steam, beside company profiles and dated news from Akta. Sample sizes and capture dates stay visible.' },
  { title: 'One question', text: 'The evidence becomes a single proposed question for the fund manager about the cash attached to this interest. Nothing is sent until you share it.' },
  { title: 'The exact version', text: 'Every answer and approval is tied to the offer version it applied to. When a term changes, the earlier approval stops applying and the difference is shown.' },
];

// Full-screen landing, then the offer and the method on dark sections.
export function Hero({ data, next }: { data: CaseView; next: NextStep | null }) {
  const status = data.privateReview?.status;
  return <>
    <section className="landing-home" aria-labelledby="hero-title">
      <div className="lh-top">
        <h1 id="hero-title">Review of a proposed<br/>secondary sale</h1>
        <div className="lh-side">
          <p>Evidence on the fund&rsquo;s holdings, the manager&rsquo;s response and the offer terms, recorded by version.</p>
          {next && <button className="lh-cta" onClick={next.onSelect}>{next.label}</button>}
        </div>
      </div>
      <div className="lh-band" aria-hidden="true">
        <svg width="100%" height="100%">
          <defs><pattern id="lh-stripes" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="28" height="28" fill="#d4f5a0"/><rect width="9" height="28" fill="#bfe58a"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#lh-stripes)"/>
        </svg>
      </div>
    </section>

    <section className="dark-offer" aria-labelledby="offer-title">
      <div className="do-left">
        <span className="tag-pill">{data.mode === 'user' ? 'Terms entered by the investor' : 'Illustrative fund and deal'}</span>
        <h2 id="offer-title">The offer under review</h2>
        <p>{data.title}</p>
        {status && <p className="do-status">{statusLabel[status]}</p>}
      </div>
      <div className="do-cards">
        <article><h3>Purchase payment</h3><p className="do-figure"><CountUp cents={data.offer.purchasePriceCents}/></p></article>
        <article><h3>Distribution goes to</h3><p className="do-figure">{recipientLabel(data.offer.distributionRecipient)}</p></article>
        <article><h3>Offer version</h3><p className="do-figure">v{data.offer.version}</p></article>
      </div>
    </section>

    <section className="dark-why" aria-labelledby="why-title">
      <span className="tag-pill">How the review works</span>
      <h2 id="why-title">Evidence, question, <span className="lime">version</span></h2>
      <ol>{steps.map((s, i) => <li key={s.title}>
        <span className="why-no">{String(i + 1).padStart(2, '0')}</span>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
      </li>)}</ol>
    </section>
  </>;
}
