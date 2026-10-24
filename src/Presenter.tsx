import { useEffect, useRef } from 'react';
import type { ProviderStatus, Role } from '../shared/contracts';
import { roleLabels } from './format';

interface Props {
  open: boolean; onClose: () => void;
  role: Role; onRole: (role: Role) => void; busy: boolean;
  hosted: boolean; rehearsal: boolean;
  onRefresh: () => void; onSignOut: () => void;
  providers: ProviderStatus[];
  canInsertAnswer: boolean; onInsertAnswer: () => void;
}

// Presenter and integrations surface: role simulation, rehearsal notices and sponsor status.
export function Presenter(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current; if (!dialog) return;
    if (p.open && !dialog.open) dialog.showModal();
    if (!p.open && dialog.open) dialog.close();
  }, [p.open]);

  return <dialog ref={ref} className="presenter" aria-labelledby="presenter-title" onClose={p.onClose}>
    <div className="presenter-head">
      <h2 id="presenter-title">Presenter</h2>
      <button className="secondary" onClick={p.onClose}>Close</button>
    </div>

    <section>
      <h3>View as</h3>
      <div className="segmented" role="group" aria-label="Participant">
        {(Object.keys(roleLabels) as Role[]).map(value =>
          <button key={value} className={p.role === value ? 'on' : ''} aria-pressed={p.role === value} disabled={p.busy} onClick={() => p.onRole(value)}>{roleLabels[value]}</button>)}
      </div>
      <p className="fine">{p.hosted
        ? 'The presenter session may operate all three roles. The server sets the role; these are not verified counterparty identities.'
        : 'Local role simulation using a request header. This is not authentication.'}</p>
      <div className="row">
        <button className="secondary" disabled={p.busy} onClick={p.onRefresh}>{p.busy ? 'Working' : 'Refresh case'}</button>
        {p.hosted && <button className="secondary" onClick={p.onSignOut}>Sign out</button>}
      </div>
    </section>

    {p.canInsertAnswer && <section>
      <h3>Manager response</h3>
      <p className="fine">Fills the response field with a labeled scenario answer assuming a $100,000 distribution. It is a scenario input, not a finding from player data.</p>
      <button className="secondary" onClick={() => { p.onInsertAnswer(); p.onClose(); }}>Insert labeled response</button>
    </section>}

    {p.rehearsal && <section>
      <h3>Rehearsal mode</h3>
      <p className="fine">This run starts from a captured sponsor review, not a fresh API call. Decisions are saved to a separate rehearsal database. Say so when presenting saved research.</p>
    </section>}

    <section>
      <h3>Integrations</h3>
      <p className="fine">Calls observed by the running API. Saved task and trace receipts remain valid after a restart.</p>
      <ul className="providers">
        {p.providers.length === 0 && <li className="fine">No provider status available.</li>}
        {p.providers.map(item => <li key={item.provider} title={item.detail}><span>{item.provider}</span><span className="muted">{item.status.replaceAll('_', ' ')}</span></li>)}
      </ul>
      <p className="fine">Evidence: Steam public reviews, Akta company research. Question: Roundtable task, Nicrron model, PRISM trace. Task and trace identifiers appear under Evidence and integrations on each saved question.</p>
    </section>
  </dialog>;
}
