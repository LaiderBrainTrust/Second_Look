import { useState } from 'react';
import { api } from './api';

type Choice = 'account' | 'presenter';

interface Props {
  ready: boolean; loadError: string;
  // True when a one-time invitation link was opened. Accepting is always an explicit button press.
  invited: boolean;
  onSignedIn: () => void;
  onAcceptWithAccount: (details: { handle: string; displayName: string; password: string }) => Promise<void>;
}

export function Login({ ready, loadError, invited, onSignedIn, onAcceptWithAccount }: Props) {
  const [choice, setChoice] = useState<Choice>('account');
  const [mode, setMode] = useState<'sign-in' | 'create'>('sign-in');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<void>) {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed.'); } finally { setBusy(false); }
  }
  const submitAccount = (event: React.FormEvent) => { event.preventDefault(); void run(async () => {
    if (mode === 'sign-in') await api('/api/session/login', { handle, password });
    else if (invited) { await onAcceptWithAccount({ handle, displayName, password }); return; }
    else await api('/api/accounts', { handle, displayName, password, registrationCode });
    setPassword(''); setRegistrationCode(''); onSignedIn();
  }); };
  const submitPresenter = (event: React.FormEvent) => { event.preventDefault(); void run(async () => {
    await api('/api/session/login', { code }); setCode(''); onSignedIn();
  }); };

  return <main className="login">
    <p className="wordmark">Second Look</p>
    <h1>Review the deal you are approving.</h1>
    <p className="lede">Inspect outside evidence on a fund&rsquo;s holdings, put the open question to the manager, and confirm that the terms you approved are the terms on the table.</p>

    {invited && <p className="notice" role="status">You opened an invitation link. It grants access to one case and one role. Sign in or create an account, then confirm to accept it. Nothing is accepted until you do.</p>}
    {(error || loadError) && <p className="alert" role="alert">{error || loadError}</p>}

    {!ready ? (!loadError && <p role="status" className="muted">Connecting</p>) : <>
      <div className="segmented wide" role="group" aria-label="Sign-in method">
        <button className={choice === 'account' ? 'on' : ''} aria-pressed={choice === 'account'} onClick={() => { setChoice('account'); setError(''); }}>Account</button>
        <button className={choice === 'presenter' ? 'on' : ''} aria-pressed={choice === 'presenter'} onClick={() => { setChoice('presenter'); setError(''); }}>Team presentation</button>
      </div>

      {choice === 'account' && <form onSubmit={submitAccount}>
        <div className="tabs compact" role="group" aria-label="Account action">
          <button type="button" className="tab" aria-current={mode === 'sign-in' ? 'page' : undefined} onClick={() => { setMode('sign-in'); setError(''); }}>Sign in</button>
          <button type="button" className="tab" aria-current={mode === 'create' ? 'page' : undefined} onClick={() => { setMode('create'); setError(''); }}>Create account</button>
        </div>
        <label htmlFor="handle">Handle</label>
        <input id="handle" name="username" autoComplete="username" value={handle} onChange={e => setHandle(e.target.value.toLowerCase())} required minLength={3} maxLength={60} pattern="[a-z0-9][a-z0-9._\-]*"/>
        {mode === 'create' && <>
          <label htmlFor="display-name">Display name</label>
          <input id="display-name" name="name" autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={120}/>
        </>}
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'create' ? 12 : 1} maxLength={256}/>
        {mode === 'create' && !invited && <>
          <label htmlFor="registration-code">Early-access enrollment code</label>
          <input id="registration-code" name="enrollment" type="password" autoComplete="off" value={registrationCode} onChange={e => setRegistrationCode(e.target.value)} required/>
          <p className="fine">Use a password of at least 12 characters, different from the enrollment code. There is no password reset yet.</p>
        </>}
        {mode === 'create' && invited && <p className="fine">Use a password of at least 12 characters. Creating the account also accepts the invitation.</p>}
        <button className="primary" disabled={busy}>{busy ? 'Working' : mode === 'sign-in' ? 'Sign in' : invited ? 'Create account and accept invitation' : 'Create account'}</button>
        <p className="fine">The display name appears in the case record beside your actions. It is not an independently verified identity.</p>
      </form>}

      {choice === 'presenter' && <form onSubmit={submitPresenter}>
        <p className="fine">For the team presentation of the example case. This does not open account cases.</p>
        <label htmlFor="access-code">Team access code</label>
        <input id="access-code" name="password" type="password" autoComplete="current-password" value={code} onChange={e => setCode(e.target.value)} required/>
        <button className="primary" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
      </form>}
    </>}
  </main>;
}
