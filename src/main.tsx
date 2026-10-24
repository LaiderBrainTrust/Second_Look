import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CaseView, ProviderStatus, Role } from '../shared/contracts';
import type { Command } from '../server/domain';
import './styles.css';
import { api } from './api';
import { roleLabels, SCENARIO_DISTRIBUTION_CENTS, scenarioAnswer } from './format';
import { Login } from './Login';
import { Cases } from './Cases';
import { DealRail } from './DealRail';
import { Holdings } from './Holdings';
import { Question } from './Question';
import { Review, Respond } from './Review';
import { People } from './People';
import { History } from './History';
import { Presenter } from './Presenter';
import { DecisionWorkbench } from '../integration/DecisionWorkbench';
import { Header, type Page } from './Header';
import { Hero, type NextStep } from './Hero';
import { Services } from './Services';
import { Footer } from './Footer';
import { startReveal } from './reveal';

type Tab = 'holdings' | 'question' | 'review' | 'offers' | 'people' | 'history';
const exampleTabs: [Tab, string][] = [['holdings', 'Holdings'], ['question', 'Question'], ['review', 'Review'], ['offers', 'Compare offers'], ['history', 'Record']];
const caseTabs: [Tab, string][] = [['review', 'Question and answer'], ['offers', 'Compare offers'], ['people', 'People'], ['history', 'Record']];

interface SessionInfo { hosted: boolean; authenticated: boolean; mode?: 'presenter' | 'account'; role?: Role; user?: { id: string; handle: string; displayName: string } }

// A one-time invitation arrives in the URL fragment. Keep it in memory only and remove it from the address bar.
const capturedInvite = (() => {
  const match = /^#invite=([^&\s]+)/.exec(location.hash);
  if (match) history.replaceState(null, '', location.pathname + location.search);
  return match ? decodeURIComponent(match[1]) : null;
})();

function App() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [page, setPage] = useState<Page>('home');
  const firstScroll = useRef(true);
  const [loadError, setLoadError] = useState('');
  const [invite, setInvite] = useState<string | null>(capturedInvite);
  const [presenterRole, setPresenterRole] = useState<Role>('lp');
  const [selected, setSelected] = useState<{ id: string; role: Role } | null>(null);
  const [data, setData] = useState<CaseView | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [rehearsal, setRehearsal] = useState(false);
  const [tab, setTab] = useState<Tab>('holdings');
  const [researchVersion, setResearchVersion] = useState(0);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const account = session?.mode === 'account';
  // Account sessions work only inside a selected case; they never fall back to the example case path.
  const caseBase = account ? (selected ? `/api/cases/${encodeURIComponent(selected.id)}` : null) : '/api/case';
  const role: Role = account ? selected?.role ?? 'lp' : presenterRole;

  const loadSession = () => api<SessionInfo>('/api/session').then(value => { setSession(value); if (value.mode !== 'account' && value.role) setPresenterRole(value.role); return value; });
  useEffect(() => {
    loadSession().catch(() => setLoadError('Could not reach the application. Reload to try again.'));
    api('/api/health').then(value => setRehearsal(value.mode === 'saved-research-rehearsal')).catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.authenticated || !caseBase) { setData(null); return; }
    const controller = new AbortController();
    setData(null); setError('');
    api<CaseView>(caseBase, undefined, role, controller.signal).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [caseBase, role, session?.authenticated]);

  // A case entered by a user has no gaming catalog; start on the question and answer.
  useEffect(() => { if (data?.mode === 'user') setTab(t => (t === 'holdings' || t === 'question' ? 'review' : t)); }, [data?.id, data?.mode]);
  // Section changes bring the workspace into view; the first render stays at the top of the page.
  useEffect(() => {
    if (firstScroll.current) { firstScroll.current = false; return; }
    document.getElementById('workspace')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }, [tab, selected?.id]);

  const refreshProviders = () => { void api('/api/providers').then(setProviders).catch(() => setProviders([])); };
  useEffect(() => { if (session?.authenticated && !account) refreshProviders(); }, [session?.authenticated, account]);

  async function guarded(work: () => Promise<void>, fallback: string) {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : fallback); } finally { setBusy(false); }
  }
  const refresh = () => caseBase ? guarded(async () => setData(await api<CaseView>(caseBase, undefined, role)), 'Could not refresh.') : Promise.resolve();
  const act = (command: Command) => data && caseBase && guarded(async () => {
    setData(await api<CaseView>(`${caseBase}/commands`, { expectedRevision: data.revision, command }, role));
  }, 'Could not save.');
  const selectRole = (next: Role) => guarded(async () => {
    if (session?.hosted) await api('/api/session/role', { role: next });
    setPresenterRole(next); setTab('review');
  }, 'Could not change the role.');
  const signOut = async () => { await api('/api/session/logout', {}).catch(() => {}); location.reload(); };
  const openCase = (id: string, caseRole: Role) => { setTab('review'); setSelected({ id, role: caseRole }); };

  async function acceptInvitation(details?: { handle: string; displayName: string; password: string }) {
    const joined = await api<{ caseId: string; role: Role }>('/api/invitations/accept', { token: invite, ...details });
    setInvite(null);
    await loadSession();
    openCase(joined.caseId, joined.role);
  }

  if (!session?.authenticated) {
    return <Login ready={Boolean(session)} loadError={loadError} invited={Boolean(invite)}
      onSignedIn={() => { setPresenterRole('lp'); void loadSession(); }} onAcceptWithAccount={details => acceptInvitation(details)}/>;
  }

  const review = data?.privateReview;
  const investor = role === 'lp' && Boolean(review);
  const userCase = data?.mode === 'user';
  const game = data?.researchContext?.game;
  const tabs = userCase ? caseTabs : exampleTabs;
  const go = (target: Tab, label: string): NextStep => ({ label, onSelect: () => { setPage('home'); setTab(target); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  const next: NextStep | null = !investor || !review ? null
    : review.status === 'terms_changed' ? go('review', 'Review the changed terms')
    : review.status === 'needs_review' ? go('review', 'Review the answer')
    : review.status === 'approved' ? go('history', 'Open the record')
    : !userCase && !data?.researchContext ? go('holdings', 'Inspect the holdings')
    : go('review', 'Open the question');

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <Header page={page} onPage={setPage}>
      {account
        ? <>
            <span className="viewing">{session.user?.displayName}{selected ? `, ${roleLabels[role]}` : ''}</span>
            {selected && <button className="ghost" onClick={() => { setSelected(null); setData(null); setError(''); setPage('home'); }}>All reviews</button>}
            <button className="ghost" onClick={() => void signOut()}>Sign out</button>
          </>
        : <>
            <span className="viewing">Viewing as {roleLabels[role]}</span>
            <button className="ghost" onClick={() => setPresenterOpen(true)}>Presenter</button>
          </>}
    </Header>

    <main id="main">
      {page === 'services' ? <Services/> : account && !selected
        ? <Cases displayName={session.user?.displayName ?? 'your account'} invited={Boolean(invite)} onAcceptInvitation={() => acceptInvitation()} onOpen={openCase}/>
        : <>
          {error && <div className="alert banner" role="alert">{error} <button className="link" onClick={() => void refresh()}>Reload the latest case</button></div>}
          {!data
            ? <p role="status" className="muted pad">{error ? 'The case is unavailable.' : 'Loading the saved case'}</p>
            : <><Hero data={data} next={next}/><div className="shell">
                <DealRail data={data}/>
                <div className="workspace" id="workspace">
                  {game && investor && <p className="thread">Selected game <strong>{game}</strong> through {data.researchContext?.studio} to this interest</p>}
                  {investor && caseBase && <>
                    <nav className="tabs no-print" aria-label="Sections">
                      {tabs.map(([value, label]) => <button key={value} className="tab" aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{label}</button>)}
                    </nav>
                    {tab === 'holdings' && !userCase && <Holdings revision={data.revision} onPrepared={() => { setResearchVersion(v => v + 1); refreshProviders(); setTab('question'); }}/>}
                    {tab === 'question' && !userCase && <Question data={data} refreshVersion={researchVersion} onProviderChange={refreshProviders} onShared={next => { setData(next); setTab('review'); }}/>}
                    {tab === 'review' && <Review data={data} busy={busy} onApprove={() => void act({ kind: 'approve' })}/>}
                    {tab === 'offers' && <DecisionWorkbench caseBase={caseBase} onChanged={() => void refresh()}/>}
                    {tab === 'people' && userCase && <People base={caseBase} data={data} onChanged={() => void refresh()}/>}
                    {tab === 'history' && <History data={data} base={caseBase}/>}
                  </>}
                  {!investor && role !== 'lp' && <Respond data={data} role={role} busy={busy} answer={answer} setAnswer={setAnswer} userCase={Boolean(userCase)}
                    onAnswer={cents => void act({ kind: 'answer', distributionCents: cents, text: answer })}
                    onRevise={() => void act({ kind: 'revise', distributionRecipient: data.offer.distributionRecipient === 'seller' ? 'buyer' : 'seller' })}
                    onReviseOffer={offer => void act({ kind: 'revise_offer', ...offer })}/>}
                  {!investor && role === 'lp' && <p className="muted">The investor view is unavailable for this case.</p>}
                </div>
              </div></>}
        </>}
    </main>

    <Footer onPage={setPage}/>

    {!account && <Presenter open={presenterOpen} onClose={() => setPresenterOpen(false)} role={role} onRole={next => void selectRole(next).then(() => setPresenterOpen(false))} busy={busy}
      hosted={Boolean(session.hosted)} rehearsal={rehearsal} onRefresh={() => void refresh()} onSignOut={() => void signOut()} providers={providers}
      canInsertAnswer={role === 'gp' && Boolean(data)} onInsertAnswer={() => setAnswer(scenarioAnswer(game ?? 'the selected investment'))}/>}
  </>;
}

startReveal();
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
