import { useEffect, useRef, useState } from 'react';
import type { CaseView, Role } from '../shared/contracts';
import { api } from './api';
import { roleLabels, toCents } from './format';

interface CaseRow { id: string; title: string; revision: number; role: Role }

const blank = { title: '', ownerEntity: '', reportNote: '', offerNote: '', price: '', adjustment: '', recipient: 'seller' as 'seller' | 'buyer', question: '', research: '' as '' | 'yes' | 'no' };

interface Props {
  displayName: string;
  invited: boolean;
  onAcceptInvitation: () => Promise<void>;
  onOpen: (id: string, role: Role) => void;
}

export function Cases({ displayName, invited, onAcceptInvitation, onOpen }: Props) {
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // One request ID per distinct payload: a network retry reuses it, an edited form gets a new one.
  const attempt = useRef<{ signature: string; id: string } | null>(null);

  const load = () => api<{ cases: CaseRow[] }>('/api/cases').then(r => setCases(r.cases)).catch(e => setError(e.message));
  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      if (!form.research) throw new Error('Choose whether outside research may be used for this case.');
      const payload = {
        title: form.title.trim(), ownerEntity: form.ownerEntity.trim(),
        reportNote: form.reportNote.trim() || null, offerNote: form.offerNote.trim(),
        purchasePriceCents: toCents(form.price), priceAdjustmentCents: toCents(form.adjustment, true),
        distributionRecipient: form.recipient, question: form.question.trim(),
        allowExternalResearch: form.research === 'yes',
      };
      const signature = JSON.stringify(payload);
      if (attempt.current?.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
      const created = await api<CaseView>('/api/cases', { requestId: attempt.current.id, ...payload });
      attempt.current = null; setForm(blank); setStarting(false);
      onOpen(created.id, 'lp');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the review.'); }
    finally { setBusy(false); }
  }
  const set = (patch: Partial<typeof blank>) => setForm({ ...form, ...patch });

  return <section className="cases" aria-labelledby="cases-heading">
    <div className="section-head">
      <div>
        <h1 id="cases-heading" className="h2">Your reviews</h1>
        <p className="lede">Signed in as {displayName}. Each review is private to its participants and keeps its own offer, question, answers and approvals.</p>
      </div>
      {!starting && <button className="primary" onClick={() => setStarting(true)}>Start a review</button>}
    </div>

    {invited && <div className="notice" role="status">
      <p>An invitation link is waiting. Accepting it gives this account access to one case in the role the owner chose. It does not give access to any other case.</p>
      <button className="primary" disabled={busy} onClick={() => { setBusy(true); setError(''); void onAcceptInvitation().catch(e => setError(e instanceof Error ? e.message : 'Could not accept the invitation.')).finally(() => setBusy(false)); }}>Accept the invitation</button>
    </div>}
    {error && <p className="alert" role="alert">{error}</p>}

    {starting && <form className="start" onSubmit={create}>
      <h2>Start a review</h2>
      <p className="lede">Enter the terms from the written offer and the report. They are recorded as entered. Documents are not parsed or verified, so cite where each figure comes from.</p>
      <label htmlFor="c-title">Title</label>
      <input id="c-title" value={form.title} onChange={e => set({ title: e.target.value })} required maxLength={200}/>
      <label htmlFor="c-owner">Owner or entity that holds the interest</label>
      <input id="c-owner" value={form.ownerEntity} onChange={e => set({ ownerEntity: e.target.value })} required maxLength={200}/>
      <label htmlFor="c-report">Report reference and page (optional)</label>
      <input id="c-report" value={form.reportNote} onChange={e => set({ reportNote: e.target.value })} maxLength={1000}/>
      <label htmlFor="c-offer">Written offer reference and clause</label>
      <input id="c-offer" value={form.offerNote} onChange={e => set({ offerNote: e.target.value })} required maxLength={1000}/>
      <div className="two">
        <div><label htmlFor="c-price">Purchase payment (USD)</label><input id="c-price" inputMode="decimal" value={form.price} onChange={e => set({ price: e.target.value })} required/></div>
        <div><label htmlFor="c-adj">Price adjustment (USD, blank if unknown)</label><input id="c-adj" inputMode="decimal" value={form.adjustment} onChange={e => set({ adjustment: e.target.value })}/></div>
      </div>
      <p className="fine">Gross receipts stay unresolved until a price adjustment is entered. Enter 0 only if the written offer states no adjustment. Blank means unknown.</p>
      <label htmlFor="c-recipient">The offer says the distribution goes to</label>
      <select id="c-recipient" value={form.recipient} onChange={e => set({ recipient: e.target.value as 'seller' | 'buyer' })}><option value="seller">The seller</option><option value="buyer">The buyer</option></select>
      <label htmlFor="c-question">The question for the fund manager</label>
      <textarea id="c-question" rows={3} value={form.question} onChange={e => set({ question: e.target.value })} required maxLength={2000}/>
      <fieldset>
        <legend>Outside research for this case</legend>
        <p className="fine">If allowed, selected public evidence, an opaque case ID, the offer price, version and recipient, and the research question are processed by Akta, the team&rsquo;s Roundtable workspace, Nicrron and PRISM. Their workspace administrators may be able to see it. Source documents, report notes and participant identities are not intentionally sent. Do not use this with confidential documents.</p>
        <label className="choice"><input type="radio" name="research" checked={form.research === 'no'} onChange={() => set({ research: 'no' })}/>Do not use outside research</label>
        <label className="choice"><input type="radio" name="research" checked={form.research === 'yes'} onChange={() => set({ research: 'yes' })}/>Allow outside research</label>
      </fieldset>
      <div className="row">
        <button className="primary" disabled={busy}>{busy ? 'Saving' : 'Create the review'}</button>
        <button type="button" className="secondary" onClick={() => { setStarting(false); setError(''); }}>Cancel</button>
      </div>
    </form>}

    {cases === null ? <p role="status" className="muted">Loading your reviews</p>
      : cases.length === 0 ? (!starting && <p className="muted">You have no reviews yet. Start one, or open an invitation link from the case owner.</p>)
      : <ul className="case-list">{cases.map(c => <li key={c.id}>
          <button onClick={() => onOpen(c.id, c.role)}>
            <span className="case-title">{c.title}</span>
            <span className="fine">{roleLabels[c.role]}, case revision {c.revision}</span>
          </button>
        </li>)}</ul>}
  </section>;
}
