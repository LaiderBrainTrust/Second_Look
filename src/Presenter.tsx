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

  </dialog>;
}
