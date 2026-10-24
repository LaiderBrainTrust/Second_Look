import { useState } from 'react';
import { api } from './api';

export function Login({ ready, loadError, onSignedIn }: { ready: boolean; loadError: string; onSignedIn: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try { await api('/api/session/login', { code }); setCode(''); onSignedIn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed.'); }
    finally { setBusy(false); }
  }

  return <main className="login">
    <p className="wordmark">Second Look</p>
    <h1>Review the deal you are approving.</h1>
    <p className="lede">Inspect outside evidence on a fund&rsquo;s holdings, put the open question to the manager, and confirm that the terms you approved are the terms on the table.</p>
    {(error || loadError) && <p className="alert" role="alert">{error || loadError}</p>}
    {ready
      ? <form onSubmit={submit}>
          <label htmlFor="access-code">Team access code</label>
          <input id="access-code" name="password" type="password" autoComplete="current-password" value={code} onChange={e => setCode(e.target.value)} required/>
          <button className="primary" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
        </form>
      : !loadError && <p role="status" className="muted">Connecting</p>}
  </main>;
}
