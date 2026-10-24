import { useEffect, useState } from 'react';
import type { CaseView } from '../shared/contracts';
import { api } from './api';
import { dateTime } from './format';

interface Member { id: string; handle: string; displayName: string; role: 'lp' | 'gp' | 'buyer' }
interface Invite { id: string; role: 'gp' | 'buyer'; recipientHandle: string | null; expires: number; acceptedBy: string | null; revoked: number }
interface Issued { token: string; acceptanceUrl: string; expiresAt: string; role: 'gp' | 'buyer'; recipientHandle: string | null }
const roleName = { lp: 'Investor (owner)', gp: 'Fund manager', buyer: 'Buyer' } as const;

// Owner only: who can see this case, and one-time invitations.
export function People({ base, data, onChanged }: { base: string; data: CaseView; onChanged: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [role, setRole] = useState<'gp' | 'buyer'>('gp');
  const [recipient, setRecipient] = useState('');
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api(`${base}/members`).then(r => { setMembers(r.members); setInvites(r.invitations); }).catch(e => setError(e.message));
  useEffect(() => { void load(); }, [base]);
  async function run(work: () => Promise<void>) {
    setBusy(true); setError('');
    try { await work(); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not complete the request.'); } finally { setBusy(false); }
  }
  const allowed = data.privateReview?.allowExternalResearch;

  return <section aria-labelledby="people-heading">
    <div className="section-head"><div>
      <h2 id="people-heading">People</h2>
      <p className="lede">Invite the fund manager and the buyer to this case. Each link grants one role on this case only and works once.</p>
    </div></div>
    {error && <p className="alert" role="alert">{error}</p>}

    <section className="block" aria-label="Invite someone">
      <h3>Invite someone</h3>
      <form className="inline-form" onSubmit={e => { e.preventDefault(); void run(async () => {
        setIssued(await api<Issued>(`${base}/invitations`, { role, ...(recipient.trim() ? { recipientHandle: recipient.trim().toLowerCase() } : {}) }));
        setRecipient('');
      }); }}>
        <div><label htmlFor="inv-role">Role</label><select id="inv-role" value={role} onChange={e => setRole(e.target.value as 'gp' | 'buyer')}><option value="gp">Fund manager</option><option value="buyer">Buyer</option></select></div>
        <div><label htmlFor="inv-handle">Restrict to this account handle (optional)</label><input id="inv-handle" value={recipient} onChange={e => setRecipient(e.target.value)} maxLength={60}/></div>
        <button className="secondary" disabled={busy}>Create invitation link</button>
      </form>
      <p className="fine">Without a handle, whoever opens the link first receives the access. Share it privately, with the intended person only. It expires in 24 hours.</p>
      {issued && <div className="notice" role="status">
        <p><strong>Invitation for the {issued.role === 'gp' ? 'fund manager' : 'buyer'}.</strong> This link is shown once.</p>
        <input readOnly value={issued.acceptanceUrl} onFocus={e => e.currentTarget.select()} aria-label="Invitation link"/>
        <p className="fine">Expires {dateTime(issued.expiresAt)}.{issued.recipientHandle ? ` Only the account ${issued.recipientHandle} can accept it.` : ' Anyone with the link can accept it.'}</p>
      </div>}
    </section>

    <section className="block" aria-label="Members">
      <h3>Members</h3>
      <ul className="people">{members.map(m => <li key={m.id}><span>{m.displayName} <span className="fine inline">@{m.handle}</span></span><span className="badge">{roleName[m.role]}</span>
        {m.role !== 'lp' && <button className="secondary" disabled={busy} onClick={() => { if (window.confirm(`Remove ${m.displayName} (${roleName[m.role]}) from this case? Their earlier contributions stay in the record.`)) void run(async () => { await api(`${base}/members/${m.id}/revoke`, {}); }); }}>Remove</button>}
      </li>)}</ul>
      {invites.some(i => !i.acceptedBy && !i.revoked && i.expires > Date.now()) && <>
        <h4>Open invitations</h4>
        <ul className="people">{invites.filter(i => !i.acceptedBy && !i.revoked && i.expires > Date.now()).map(i => <li key={i.id}>
          <span>{roleName[i.role]}{i.recipientHandle ? `, for @${i.recipientHandle}` : ', open link'} <span className="fine inline">expires {dateTime(new Date(i.expires).toISOString())}</span></span>
          <button className="secondary" disabled={busy} onClick={() => void run(async () => { await api(`${base}/invitations/${i.id}/revoke`, {}); })}>Revoke</button>
        </li>)}</ul>
      </>}
    </section>

    <section className="block" aria-label="Outside research">
      <h3>Outside research</h3>
      <p>{allowed ? 'Allowed for this case.' : 'Not allowed for this case.'}</p>
      <p className="fine">Changing this creates a new case revision and makes earlier approvals historical. Turning it off stops new requests. It does not delete data already sent or recall a task already dispatched.</p>
      <button className="secondary" disabled={busy} onClick={() => void run(async () => { await api(`${base}/external-research`, { expectedRevision: data.revision, enabled: !allowed }); onChanged(); })}>{allowed ? 'Turn off outside research' : 'Allow outside research'}</button>
    </section>
  </section>;
}
