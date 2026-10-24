import { useState } from 'react';
import type { CaseView } from '../shared/contracts';
import { SCENARIO_DISTRIBUTION_CENTS, centsToInput, recipientLabel, roleLabels, toCents, usd } from './format';

function Question({ data }: { data: CaseView }) {
  return <section className="block" aria-label="Question for the fund manager">
    <h3>Question for the fund manager</h3>
    <p>{data.question}</p>
    {data.questionSource?.url && <p><a href={data.questionSource.url} target="_blank" rel="noreferrer">Read the source behind this question (external)</a></p>}
    <p className="fine">Next: {roleLabels[data.nextOwner]}</p>
  </section>;
}

function Answer({ data }: { data: CaseView }) {
  return <section className="block" aria-label="Manager's answer">
    <h3>Manager&rsquo;s answer</h3>
    {data.answer
      ? <blockquote>{data.answer.text}<footer>{data.answer.source.label}, answer v{data.answer.version}</footer></blockquote>
      : <p className="muted">Waiting for the fund manager&rsquo;s response.</p>}
  </section>;
}

// Investor view: the question, the answer and the review of the current offer version.
export function Review({ data, busy, onApprove }: { data: CaseView; busy: boolean; onApprove: () => void }) {
  const review = data.privateReview!;
  const context = data.researchContext;
  return <section aria-labelledby="review-heading">
    <div className="section-head"><div>
      <h2 id="review-heading">Question, answer and review</h2>
      <p className="lede">The game evidence led to a question. Only the manager&rsquo;s response can establish the cash assumption. Player counts and fund NAV exposure do not calculate it.</p>
    </div></div>

    {review.status === 'terms_changed' && <div className="callout" role="status">
      <strong>The terms or the supporting answer changed.</strong>
      <p>Your earlier approval remains on record but does not apply to offer version {data.offer.version}. Review the current response before approving again.</p>
    </div>}

    <ol className="chain">
      <li><span className="label">Evidence</span>{context ? <>{context.game}, {context.studio}. Question shared at revision {context.sharedAtRevision}.</> : 'No game evidence has been shared yet. Start under Holdings.'}</li>
      <li><span className="label">Cash attributable to this interest</span>{data.answer ? <>{usd(data.answer.distributionCents)}, entered by the fund manager role as a scenario assumption.</> : 'Unresolved. Waiting for the manager.'}</li>
      <li><span className="label">Current offer</span>Version {data.offer.version}. Distribution goes to {recipientLabel(data.offer.distributionRecipient)}. {review.status === 'approved' ? 'Reviewed for this version.' : 'Investor review is still required.'}</li>
    </ol>

    <Question data={data}/>
    <Answer data={data}/>

    <section className="block approve" aria-label="Your review">
      <h3>{review.grossReceiptsCents === null ? 'Amount not yet established' : `${usd(review.grossReceiptsCents)} gross receipts`}</h3>
      <p>{review.responseText}</p>
      <p className="fine">Scenario figures. Investment owner: {review.ownerEntity}. Source: {review.report.label}.</p>
      <button className="primary" disabled={busy || review.status === 'approved' || review.grossReceiptsCents === null} onClick={onApprove}>
        {review.status === 'approved' ? 'Reviewed for this version' : busy ? 'Saving' : 'Approve this proposed response'}
      </button>
      <p className="fine">This records your review in the application. It does not send a response or accept a sale.</p>
    </section>
  </section>;
}

interface OfferRevision { purchasePriceCents: number; priceAdjustmentCents: number | null; distributionRecipient: 'seller' | 'buyer'; sourceNote: string }
interface RespondProps {
  data: CaseView; role: 'gp' | 'buyer'; busy: boolean; userCase: boolean;
  answer: string; setAnswer: (text: string) => void;
  onAnswer: (distributionCents: number) => void; onRevise: () => void; onReviseOffer: (offer: OfferRevision) => void;
}

// Fund manager and buyer views: the shared question plus the one command that role may issue.
export function Respond({ data, role, busy, userCase, answer, setAnswer, onAnswer, onRevise, onReviseOffer }: RespondProps) {
  const next = data.offer.distributionRecipient === 'seller' ? 'buyer' : 'seller';
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState(centsToInput(data.offer.purchasePriceCents));
  const [adjustment, setAdjustment] = useState(data.offer.priceAdjustmentCents === null ? '' : centsToInput(data.offer.priceAdjustmentCents));
  const [recipient, setRecipient] = useState<'seller' | 'buyer'>(data.offer.distributionRecipient);
  const [sourceNote, setSourceNote] = useState('');
  const [localError, setLocalError] = useState('');
  const guard = (work: () => void) => { setLocalError(''); try { work(); } catch (e) { setLocalError(e instanceof Error ? e.message : 'Check the entered amounts.'); } };

  return <section aria-labelledby="respond-heading">
    <div className="section-head"><div>
      <h2 id="respond-heading">{role === 'gp' ? 'Respond as the fund manager' : 'Revise the offer as the buyer'}</h2>
      <p className="lede">{userCase ? `You are signed in as the ${roleLabels[role].toLowerCase()} on this case.` : `Viewing as ${roleLabels[role]}, operated from the presenter panel.`} The investor&rsquo;s private review is not available to this role.</p>
    </div></div>
    {localError && <p className="alert" role="alert">{localError}</p>}
    <Question data={data}/>
    <Answer data={data}/>

    {role === 'gp' && <form className="block" onSubmit={e => { e.preventDefault(); guard(() => onAnswer(userCase ? toCents(amount)! : SCENARIO_DISTRIBUTION_CENTS)); }}>
      <h3>Your response</h3>
      {userCase
        ? <>
            <label htmlFor="amount">Distribution attributable to this interest (USD)</label>
            <input id="amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required/>
            <p className="fine">This is your own statement. It is recorded under your account and is not checked against fund documents.</p>
          </>
        : <p className="fine">Scenario assumption: a {usd(SCENARIO_DISTRIBUTION_CENTS)} distribution attributable to this LP interest. It is entered by the manager role, not inferred from game performance.</p>}
      <label htmlFor="answer">Explanation of the rights and the distribution</label>
      <textarea id="answer" value={answer} onChange={e => setAnswer(e.target.value)} maxLength={5000} required rows={5}/>
      <button className="primary" disabled={busy || !answer.trim() || (userCase && !amount.trim())}>{busy ? 'Saving' : 'Save response'}</button>
    </form>}

    {role === 'buyer' && !userCase && <section className="block" aria-label="Revise the distribution term">
      <h3>Distribution term</h3>
      <p>Keep the {usd(data.offer.purchasePriceCents)} purchase payment and move the distribution from {recipientLabel(data.offer.distributionRecipient)} to {recipientLabel(next)}. This creates offer version {data.offer.version + 1} and makes any earlier approval historical.</p>
      <button className="primary" disabled={busy} onClick={onRevise}>{busy ? 'Saving' : `Assign the distribution to ${recipientLabel(next)}`}</button>
    </section>}

    {role === 'buyer' && userCase && <form className="block" onSubmit={e => { e.preventDefault(); guard(() => onReviseOffer({ purchasePriceCents: toCents(price)!, priceAdjustmentCents: toCents(adjustment, true), distributionRecipient: recipient, sourceNote: sourceNote.trim() })); }}>
      <h3>Revise the offer</h3>
      <p className="fine">Saving creates offer version {data.offer.version + 1} and makes any earlier approval historical. Taxes, fees and timing are not modeled.</p>
      <div className="two">
        <div><label htmlFor="r-price">Purchase payment (USD)</label><input id="r-price" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} required/></div>
        <div><label htmlFor="r-adj">Price adjustment (USD, blank if unknown)</label><input id="r-adj" inputMode="decimal" value={adjustment} onChange={e => setAdjustment(e.target.value)}/></div>
      </div>
      <label htmlFor="r-recipient">Distribution goes to</label>
      <select id="r-recipient" value={recipient} onChange={e => setRecipient(e.target.value as 'seller' | 'buyer')}><option value="seller">The seller</option><option value="buyer">The buyer</option></select>
      <label htmlFor="r-source">Reference for this revision (written offer, clause)</label>
      <input id="r-source" value={sourceNote} onChange={e => setSourceNote(e.target.value)} required maxLength={1000}/>
      <button className="primary" disabled={busy}>{busy ? 'Saving' : 'Save the revised offer'}</button>
    </form>}
  </section>;
}
