import { useEffect, useState } from 'react';
import type { FundingAnalysis, X1Evidence } from '../shared/funding';
const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
const dollars=(s:string)=>{if(!/^\d{1,10}(\.\d{1,2})?$/.test(s.trim()))throw Error('Use non-negative dollar amounts with at most two decimal places.');const [d,c='']=s.trim().split('.');return Number(d)*100+Number(c.padEnd(2,'0'));};
type FundingPanelProps={caseBase:string;revision:number;ownerEntity:string;onChanged:()=>void};
export function FundingPanel(props:FundingPanelProps) { return <FundingPanelBody key={props.caseBase} {...props}/>; }
function FundingPanelBody({caseBase,revision,ownerEntity,onChanged}:FundingPanelProps) {
 const [data,setData]=useState<FundingAnalysis|null>(null),[connected,setConnected]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [canOAuth,setCanOAuth]=useState(false);
 const [canConnect,setCanConnect]=useState(false),[connectionMode,setConnectionMode]=useState('not_connected');
 const [editing,setEditing]=useState(false),[dirty,setDirty]=useState(false);
 const [form,setForm]=useState({ownerEntity,amount:'',neededBy:'',cash:'',cashAsOf:'',confirmed:false,source:''});
 const [query,setQuery]=useState(''),[matches,setMatches]=useState<(X1Evidence&{selectionId:string})[]>([]),[searched,setSearched]=useState(false);
 const headers={'Content-Type':'application/json','x-demo-role':'lp'};
 async function post(path:string,body:unknown){const r=await fetch(`${caseBase}/${path}`,{method:'POST',headers,body:JSON.stringify(body)});const value=await r.json();if(!r.ok)throw Error(value.error??'Request failed. Refresh current state before retrying.');return value;}
 useEffect(()=>{const abort=new AbortController();Promise.all(['funding','x1'].map(async p=>{const r=await fetch(`${caseBase}/${p}`,{headers,signal:abort.signal});const v=await r.json();if(!r.ok)throw Error(v.error);return v;})).then(([f,x])=>{setData(f);setConnected(x.configured);setCanConnect(Boolean(x.canConnect));setCanOAuth(Boolean(x.canConnectOAuth));setConnectionMode(x.mode);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[caseBase,revision]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function edit(){const f=data?.funding;setForm(f?{ownerEntity:f.ownerEntity,amount:String(f.amountCents/100),neededBy:f.neededBy,cash:f.availableCashCents===null?'':String(f.availableCashCents/100),cashAsOf:f.cashAsOf??'',confirmed:f.cashConfirmedForThisEntity,source:f.sourceNote}:{ownerEntity,amount:'',neededBy:'',cash:'',cashAsOf:'',confirmed:false,source:''});setEditing(true);}
 function update(values:Partial<typeof form>){setForm({...form,...values});setDirty(true);}
 async function save(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{await post('diligence/commands',{expectedRevision:revision,command:{kind:'save_funding',funding:{ownerEntity:form.ownerEntity,amountCents:dollars(form.amount),neededBy:form.neededBy,availableCashCents:form.cash.trim()?dollars(form.cash):null,cashAsOf:form.cashAsOf||null,cashConfirmedForThisEntity:form.confirmed,sourceNote:form.source}}});setEditing(false);setDirty(false);onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function search(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setMatches([]);setSearched(false);try{const r=await post('x1/search',{expectedRevision:revision,query});setMatches(r.matches);setSearched(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function importSource(selectionId:string){if(busy)return;setBusy(true);setError('');try{await post('x1/import',{expectedRevision:revision,selectionId});setMatches([]);setSearched(false);onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function connect(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const form=e.currentTarget;const key=String(new FormData(form).get('x1Key')??'');form.reset();setBusy(true);setError('');setMatches([]);setSearched(false);try{const result=await post('x1/connection',{key});setConnected(result.configured);setConnectionMode(result.mode);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function authorize(){if(busy)return;setBusy(true);setError('');try{const result=await post('x1/authorize',{});const url=new URL(result.authorizationUrl);if(url.origin!=='https://clerk.x1wealth.com'||url.pathname!=='/oauth/authorize')throw Error('Invalid X1 authorization address.');window.location.assign(url.toString());}catch(e){setError((e as Error).message);setBusy(false);}}
 async function disconnect(){if(busy)return;setBusy(true);setError('');setMatches([]);setSearched(false);try{const result=await post('x1/disconnect',{});if(result.notice)setError(result.notice);setConnected(false);setConnectionMode('not_connected');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section aria-labelledby="funding-heading" className="funding-panel">
  <h3 id="funding-heading">Will the money arrive when you need it?</h3>
  <p>Compare proceeds against a specific funding need. This scenario uses entered cash and payment dates; it does not verify settlement.</p>
  {error&&<p role="alert">{error}</p>}
  {!editing&&<button className="secondary" onClick={edit}>{data?.funding?'Edit funding need':'Add funding need'}</button>}
  {editing&&<form onSubmit={save}>
   <label>Entity that needs the cash<input value={form.ownerEntity} required onChange={e=>update({ownerEntity:e.target.value})}/></label>
   <label>Amount needed (USD)<input inputMode="decimal" value={form.amount} required onChange={e=>update({amount:e.target.value})}/></label>
   <label>Needed by<input type="date" value={form.neededBy} required onChange={e=>update({neededBy:e.target.value})}/></label>
   <label>Available cash (USD; blank means unknown)<input inputMode="decimal" value={form.cash} onChange={e=>update({cash:e.target.value})}/></label>
   <label>Cash checked as of<input type="date" value={form.cashAsOf} onChange={e=>update({cashAsOf:e.target.value})}/></label>
   <label>Supporting source or assumptions<input value={form.source} required maxLength={2000} onChange={e=>update({source:e.target.value})}/></label>
   <label className="funding-check"><input type="checkbox" checked={form.confirmed} onChange={e=>update({confirmed:e.target.checked})}/>This cash is unrestricted, uncommitted, usable by this same entity and excludes the offer proceeds shown above.</label>
   <p>Saving updates the private case and makes prior reviews historical. It does not move money or change your X1 record.</p>
   <button disabled={busy}>{busy?'Saving…':'Save funding need'}</button><button type="button" className="secondary" onClick={()=>{setEditing(false);setDirty(false);}}>Cancel</button>
  </form>}
  {data?.funding&&<><p><strong>{usd(data.funding.amountCents)}</strong> needed by {data.funding.neededBy} for {data.funding.ownerEntity}.</p><p>{data.funding.sourceNote}</p>
   {data.cashGapCents!==null&&<p>{data.cashGapCents===0?'The entered available cash covers this need without sale proceeds. This does not determine whether to sell.':`Gap before any sale proceeds: ${usd(data.cashGapCents)}.`}</p>}
   {data.blockers.length>0&&<ul>{data.blockers.map(b=><li key={b}>{b}</li>)}</ul>}
   <ul>{data.offers.map(o=><li key={o.id}><strong>{o.buyer}: </strong>{o.status==='unresolved'?`Unresolved — ${o.reasons.join(' ')}`:o.status==='shortfall'?`${usd(o.shortfallCents!)} short of the need by the deadline.`:`Covers the stated need under these assumptions (${usd(o.cashByDeadlineCents!)} including entered cash).`}</li>)}</ul>
  </>}
  <details><summary>Use evidence from X1</summary><p>{connected?(connectionMode==='individual_case_read_only'?'Your X1 connection is available for this case. Only you can search it.':'Connected to the synthetic X1 account for this example.'):'X1 is not connected for this case. Entered facts above remain usable.'}</p>
   {canOAuth&&<><p>Connect read-only access to your own X1 documents. You choose which excerpts to copy into this case; other participants do not receive your X1 access.</p><button type="button" disabled={busy||dirty} onClick={()=>void authorize()}>{busy?'Connecting…':connected?'Reconnect X1':'Connect X1'}</button>{dirty&&<p>Save or cancel your funding edits before connecting X1.</p>}</>}
   {canConnect&&!canOAuth&&!connected&&<form onSubmit={connect}><p>Create a <strong>read-only</strong> key in <a href="https://app.x1wealth.com/settings/api-keys" target="_blank" rel="noreferrer">X1 API key settings</a>, then connect it here. X1 account eligibility applies. Second Look stores the key encrypted on its server and uses it only for your document search in this case.</p><label>Read-only X1 key<input type="password" name="x1Key" autoComplete="off" spellCheck={false} required maxLength={504} placeholder="x1k_…"/></label><button disabled={busy}>{busy?'Connecting…':'Connect my X1'}</button></form>}
   {connectionMode==='individual_case_read_only'&&<><p>Disconnect stops future searches here. Copied excerpts and their history remain. OAuth disconnect also attempts to revoke the authorization in X1. API keys can be revoked in X1 settings.</p><button type="button" className="secondary" disabled={busy} onClick={()=>void disconnect()}>{busy?'Working…':'Disconnect X1'}</button></>}
   {connected&&<form onSubmit={search}><label>Find a supporting passage<input value={query} minLength={3} maxLength={300} required onChange={e=>setQuery(e.target.value)}/></label><button disabled={busy}>Search X1</button></form>}
   {searched&&!matches.length&&<p>No matching excerpts were returned. This does not establish that the document is absent.</p>}
   {matches.map(m=><article key={m.selectionId}><h4>{m.label}{m.page?` · page ${m.page}`:''}</h4><blockquote>{m.snippet}</blockquote><p>Source date: {m.sourceDate??'not supplied'}. Retrieved: {m.retrievedAt}.</p><button disabled={busy} onClick={()=>void importSource(m.selectionId)}>Copy this excerpt into the private case</button></article>)}
   <p>Copies retain source references and retrieval time. They do not refresh automatically or grant teammates access to X1. Importing does not fill or verify financial amounts or ownership. Copies and prior versions remain in the case history.</p>
   {data?.evidence.map((m,i)=><article key={`${m.contentHash}-${i}`}><h4>{m.label}{m.page?` · page ${m.page}`:''}</h4><blockquote>{m.snippet}</blockquote><p>Source: {m.ref}. Date: {m.sourceDate??'not supplied'}. Retrieved: {m.retrievedAt}.</p></article>)}
  </details>
 </section>;
}
