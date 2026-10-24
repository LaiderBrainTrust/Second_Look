import { createHash, randomBytes } from 'node:crypto';
import { Router, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { WorkspaceAccess } from './workspace-access.js';
import type { X1Connections } from './x1-connections.js';
import { DomainError } from './domain.js';
import { validateX1Key } from './x1-context.js';

export const X1_CALLBACK = 'https://secondlook.ac/api/connections/x1/callback';
const issuer = 'https://clerk.x1wealth.com';
const cookieName = '__Host-second-look-x1';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const cookie = (value: string, age=600) => `${cookieName}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const cookieValue = (header?: string) => header?.split(';').map(p=>p.trim()).find(p=>p.startsWith(`${cookieName}=`))?.slice(cookieName.length+1) ?? '';
type Tokens = {kind:'oauth';accessToken:string;refreshToken?:string;expiresAt:number};
type Pending = {state:string;binding:string;caseId:string;userId:string;session:string;epoch:number;expires:number;payload:string;phase:string};
function tokens(value:string):Tokens|undefined {
  if(!value.startsWith('{'))return undefined; // backwards-compatible API key
  try { const t=JSON.parse(value); if(t.kind==='oauth'&&typeof t.accessToken==='string'&&Number.isFinite(t.expiresAt))return t; } catch {}
  throw new DomainError(503,'Reconnect X1 to restore this connection.');
}

export function createX1OAuth(db:DatabaseSync,access:WorkspaceAccess,connections:X1Connections,origin:string,
  dependencies:{fetch?:typeof fetch;validate?:(key:string)=>Promise<void>}={}) {
  const fetcher=dependencies.fetch??fetch;
  const validate=dependencies.validate??validateX1Key;
  db.exec(`CREATE TABLE IF NOT EXISTS x1_oauth_pending (
    state TEXT PRIMARY KEY, binding TEXT UNIQUE NOT NULL, caseId TEXT NOT NULL, userId TEXT NOT NULL,
    session TEXT NOT NULL, epoch INTEGER NOT NULL, expires INTEGER NOT NULL, payload TEXT NOT NULL, phase TEXT NOT NULL
  )`);
  const ready=()=>origin==='https://secondlook.ac' && connections.ready() && Boolean(process.env.X1_OAUTH_CLIENT_ID);
  function clientParameters(){
    const clientId=process.env.X1_OAUTH_CLIENT_ID;
    if(!ready()||!clientId)throw new DomainError(503,'X1 browser connection is not enabled on this server yet.');
    return {client_id:clientId,...(process.env.X1_OAUTH_CLIENT_SECRET?{client_secret:process.env.X1_OAUTH_CLIENT_SECRET}:{})};
  }
  async function tokenRequest(parameters:Record<string,string>):Promise<Tokens>{
    try{
      const response=await fetcher(`${issuer}/oauth/token`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...clientParameters(),...parameters})});
      if(!response.ok)throw Error('Token refused');
      const t=await response.json();
      if(t.token_type?.toLowerCase()!=='bearer'||typeof t.access_token!=='string'||!/^oat_[A-Za-z0-9]{16,128}$/.test(t.access_token)||!Number.isFinite(t.expires_in)||t.expires_in<=0||t.expires_in>604800)throw Error('Invalid token');
      if(t.refresh_token!==undefined&&(typeof t.refresh_token!=='string'||t.refresh_token.length>8192))throw Error('Invalid refresh');
      return {kind:'oauth',accessToken:t.access_token,...(t.refresh_token?{refreshToken:t.refresh_token}:{}),expiresAt:Date.now()+t.expires_in*1000};
    }catch{throw new DomainError(503,'X1 authorization could not be completed. Reconnect X1 and try again.');}
  }
  async function revoke(t:Tokens){
    try{
      const r=await fetcher(`${issuer}/oauth/token/revoke`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...clientParameters(),token:t.refreshToken??t.accessToken,token_type_hint:t.refreshToken?'refresh_token':'access_token'})});
      return r.ok;
    }catch{return false;}
  }
  function owner(res:Response,caseId:string){
    if(res.locals.session?.mode!=='account')throw new DomainError(401,'Sign in to your individual Second Look account.');
    const id=res.locals.session.user.id as string;access.requireOwner(caseId,id);return id;
  }
  function begin(res:Response,caseId:string){
    const userId=owner(res,caseId);clientParameters();
    db.prepare('DELETE FROM x1_oauth_pending WHERE expires<?').run(Date.now());
    if((db.prepare('SELECT count(*) AS n FROM x1_oauth_pending').get() as {n:number}).n>=500)throw new DomainError(429,'Too many pending X1 connections. Try again shortly.');
    // A newer attempt invalidates older attempts for this owner/case.
    db.prepare('DELETE FROM x1_oauth_pending WHERE caseId=? AND userId=?').run(caseId,userId);
    connections.invalidate(caseId,userId); // also cancels an older exchange already in flight
    const state=secret(),binding=secret(),verifier=secret();const stateHash=hash(state);
    const p={verifier};
    db.prepare('INSERT INTO x1_oauth_pending VALUES (?,?,?,?,?,?,?,?,?)').run(stateHash,hash(binding),caseId,userId,hash(res.locals.sessionId),connections.epoch(caseId,userId),Date.now()+600000,connections.seal(JSON.stringify(p),stateHash),'started');
    const url=new URL(`${issuer}/oauth/authorize`);
    url.search=new URLSearchParams({client_id:process.env.X1_OAUTH_CLIENT_ID!,redirect_uri:X1_CALLBACK,response_type:'code',scope:'openid profile email',state,code_challenge:hashChallenge(verifier),code_challenge_method:'S256',resource:'https://mcp.x1wealth.com/mcp'}).toString();
    res.setHeader('Set-Cookie',cookie(binding));
    return {authorizationUrl:url.toString()};
  }
  const publicRouter=Router();
  publicRouter.get('/api/connections/x1/callback',(req,res,next)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
    try{
      const state=typeof req.query.state==='string'?req.query.state:'';
      if(!/^[A-Za-z0-9_-]{43}$/.test(state))throw new DomainError(400,'X1 connection expired. Start again from your case.');
      const p=db.prepare('SELECT * FROM x1_oauth_pending WHERE state=?').get(hash(state)) as Pending|undefined;
      if(!p||p.phase!=='started'||p.expires<Date.now()||p.binding!==hash(cookieValue(req.header('cookie'))))throw new DomainError(400,'X1 connection expired or belongs to another browser. Start again from your case.');
      if(req.query.error){db.prepare('DELETE FROM x1_oauth_pending WHERE state=?').run(p.state);throw new DomainError(400,'X1 connection was not approved. Return to your case to try again.');}
      if(req.query.iss!==issuer||typeof req.query.code!=='string'||req.query.code.length<1||req.query.code.length>4096)throw new DomainError(400,'X1 returned an invalid authorization response. Start again.');
      const payload=JSON.parse(connections.open(p.payload,p.state));
      db.prepare("UPDATE x1_oauth_pending SET payload=?,phase='returned' WHERE state=? AND phase='started'").run(connections.seal(JSON.stringify({...payload,code:req.query.code}),p.state),p.state);
      // No account session is established here. Strict session cookies are checked
      // only after the user continues from a clean same-origin page.
      res.redirect(303,'/connections/x1/return');
    }catch(e){next(e);}
  });
  publicRouter.get('/connections/x1/return',(_req,res)=>{
    const nonce=secret();res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; style-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`);
    res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect X1 — Second Look</title><main><h1>Finish connecting X1</h1><p>Continue to connect read-only X1 document access to the case you selected. This does not change your Second Look account or share your X1 access with other participants.</p><button id="finish">Connect to my case</button><p id="status" role="status" aria-live="polite"></p><a id="back" href="/">Return to Second Look</a></main><script nonce="${nonce}">document.getElementById('finish').onclick=async()=>{const b=document.getElementById('finish'),s=document.getElementById('status');b.disabled=true;s.textContent='Connecting…';try{const r=await fetch('/api/connections/x1/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const v=await r.json();if(!r.ok)throw Error(v.error||'Could not connect X1.');s.textContent='X1 is connected to your selected case. You can now search and choose excerpts to import.';document.getElementById('back').href='/#case='+encodeURIComponent(v.caseId);}catch(e){s.textContent=e.message;b.disabled=false;}};</script></html>`);
  });
  const privateRouter=Router();
  privateRouter.post('/complete',async(req,res,next)=>{
    let received:Tokens|undefined;
    try{
      const p=db.prepare('SELECT * FROM x1_oauth_pending WHERE binding=?').get(hash(cookieValue(req.header('cookie')))) as Pending|undefined;
      if(!p||p.phase!=='returned'||p.expires<Date.now())throw new DomainError(409,'X1 connection expired. Start again from your case.');
      if(owner(res,p.caseId)!==p.userId||hash(res.locals.sessionId)!==p.session)throw new DomainError(403,'Return using the same Second Look account and session that started this connection.');
      if(connections.epoch(p.caseId,p.userId)!==p.epoch)throw new DomainError(409,'Your X1 connection changed. Start again from your case.');
      const payload=JSON.parse(connections.open(p.payload,p.state));
      db.prepare('DELETE FROM x1_oauth_pending WHERE state=?').run(p.state); // one attempt only, before network
      received=await tokenRequest({grant_type:'authorization_code',code:payload.code,code_verifier:payload.verifier,redirect_uri:X1_CALLBACK,resource:'https://mcp.x1wealth.com/mcp'});
      await validate(received.accessToken);
      const live=access.session(res.locals.sessionId);
      if(!live||live.user.id!==p.userId||owner(res,p.caseId)!==p.userId||connections.epoch(p.caseId,p.userId)!==p.epoch)throw new DomainError(409,'Your session or X1 connection changed. Start again.');
      const old=connections.metadata(p.caseId,p.userId)?tokens(connections.read(p.caseId,p.userId).key):undefined;
      const saved=connections.save(p.caseId,p.userId,JSON.stringify(received));received=undefined;
      res.setHeader('Set-Cookie',cookie('',0));
      if(old)await revoke(old);
      if(connections.metadata(p.caseId,p.userId)?.version!==saved.version)throw new DomainError(409,'Your X1 connection changed. Refresh your case.');
      res.json({configured:true,caseId:p.caseId,mode:'individual_case_read_only'});
    }catch(e){if(received)await revoke(received);next(e);}
  });
  const refreshing=new Map<string,Promise<string>>();
  async function credential(caseId:string,userId:string):Promise<string>{
    const saved=connections.read(caseId,userId);const t=tokens(saved.key);if(!t)return saved.key;
    if(t.expiresAt>Date.now()+60000)return t.accessToken;
    let job=refreshing.get(saved.version);
    if(!job){job=(async()=>{
      if(!t.refreshToken)throw new DomainError(409,'Your X1 authorization expired. Reconnect X1.');
      const next=await tokenRequest({grant_type:'refresh_token',refresh_token:t.refreshToken,resource:'https://mcp.x1wealth.com/mcp'});
      if(!next.refreshToken)next.refreshToken=t.refreshToken;
      try{
        await validate(next.accessToken);
        access.requireOwner(caseId,userId);
        if(!connections.replace(caseId,userId,saved.version,JSON.stringify(next)))throw new DomainError(409,'Your X1 connection changed. Search again.');
        return next.accessToken;
      }catch(e){await revoke(next);throw e;}
    })();refreshing.set(saved.version,job);}
    try{return await job;}finally{if(refreshing.get(saved.version)===job)refreshing.delete(saved.version);}
  }
  async function disconnect(caseId:string,userId:string){
    access.requireOwner(caseId,userId);
    const saved=connections.metadata(caseId,userId)?connections.read(caseId,userId):undefined;
    connections.disconnect(caseId,userId);
    db.prepare('DELETE FROM x1_oauth_pending WHERE caseId=? AND userId=?').run(caseId,userId);
    const t=saved?tokens(saved.key):undefined;
    const revoked=t?await revoke(t):false;
    return {configured:false,notice:t?(revoked?'Disconnected and X1 authorization revoked. Copied excerpts remain in the case history.':'Disconnected here. X1 could not confirm revocation; remove Second Look in X1 Connected apps. Copied excerpts remain.'):'Disconnected. Copied excerpts remain in the case history. Revoke your API key in X1 to stop its use elsewhere.'};
  }
  return {ready,begin,publicRouter,privateRouter,credential,disconnect};
}
const hashChallenge=(s:string)=>createHash('sha256').update(s).digest('base64url');
export type X1OAuth=ReturnType<typeof createX1OAuth>;
