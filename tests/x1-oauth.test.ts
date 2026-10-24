import { randomUUID, createHash } from 'node:crypto';
import express from 'express';
import { afterEach, expect, it, vi } from 'vitest';
import { createStore } from '../server/store.js';
import { createWorkspaceAccess } from '../server/workspace-access.js';
import { createX1Connections } from '../server/x1-connections.js';
import { createX1OAuth, X1_CALLBACK } from '../server/x1-oauth.js';
import { installHostedAuth } from '../server/hosted-auth.js';

const accessToken='oat_'+ 'a'.repeat(32),refreshToken='test-refresh-never-live';
const input=()=>({requestId:randomUUID(),title:'Synthetic OAuth case',ownerEntity:'Synthetic entity',reportNote:'Report p1',offerNote:'Quote p1',purchasePriceCents:10000,priceAdjustmentCents:0,distributionRecipient:'seller',question:'What changed?',allowExternalResearch:false});
afterEach(()=>vi.unstubAllEnvs());
async function harness(){
 vi.stubEnv('X1_CONNECTION_ENCRYPTION_KEY','ab'.repeat(32));vi.stubEnv('X1_OAUTH_CLIENT_ID','synthetic-client');
 const store=createStore(':memory:'),access=createWorkspaceAccess(store.db),connections=createX1Connections(store.db);
 const owner=access.register({handle:'owner',displayName:'Owner',password:'synthetic long test password'});
 const other=access.register({handle:'other',displayName:'Other',password:'synthetic long test password'});
 const caseId=access.createCase(owner.id,input()).id;
 const session=access.startSession(owner.id),otherSession=access.startSession(other.id);
 const calls:URLSearchParams[]=[];
 let wait:Promise<void>|undefined;
 const fetcher=vi.fn(async(url:any,options:any)=>{
   const body=new URLSearchParams(options.body);calls.push(body);await wait;
   expect(options.redirect).toBe('error');
   return new Response(JSON.stringify(String(url).endsWith('/revoke')?{}:{access_token:accessToken,refresh_token:refreshToken,token_type:'Bearer',expires_in:3600}),{status:200,headers:{'Content-Type':'application/json'}});
 }) as unknown as typeof fetch;
 const validate=vi.fn(async()=>{});
 const oauth=createX1OAuth(store.db,access,connections,'https://secondlook.ac',{fetch:fetcher,validate});
 const app=express();app.use(express.json());app.use(oauth.publicRouter);installHostedAuth(app,{origin:'https://secondlook.ac',accessCode:'synthetic-code-long-enough-for-test'},access);
 app.use('/api/connections/x1',oauth.privateRouter);
 app.post('/api/start',(req,res,next)=>{try{res.json(oauth.begin(res,caseId));}catch(e){next(e);}});
 app.use((e:any,_q:any,r:any,_n:any)=>r.status(e.status??500).json({error:e.status?e.message:'Failed'}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const request=(path:string,method='GET',cookies='',body?:unknown)=>fetch(base+path,{method,redirect:'manual',headers:{Origin:'https://secondlook.ac','Content-Type':'application/json',Cookie:cookies},...(body?{body:JSON.stringify(body)}:{})});
 const sessionCookie=`__Host-second-look=${session}`;
 async function start(){const r=await request('/api/start','POST',sessionCookie,{});expect(r.status).toBe(200);const url=new URL((await r.json()).authorizationUrl);const binding=r.headers.get('set-cookie')!.split(';')[0];return {url,binding};}
 const callback=(url:URL,binding:string,code='test-authorization-code')=>request(`/api/connections/x1/callback?${new URLSearchParams({state:url.searchParams.get('state')!,iss:'https://clerk.x1wealth.com',code})}`,'GET',binding);
 return {store,access,owner,caseId,session,otherSession,connections,oauth,validate,calls,start,callback,request,sessionCookie,setWait:(p?:Promise<void>)=>wait=p,close:async()=>{await new Promise<void>(r=>server.close(()=>r()));store.close();}};
}
it('uses PKCE, browser binding and same account session; encrypts tokens and consumes callback once',async()=>{
 const h=await harness();try{
  const {url,binding}=await h.start();expect(url.origin).toBe('https://clerk.x1wealth.com');expect(url.searchParams.get('redirect_uri')).toBe(X1_CALLBACK);expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect((await h.callback(url,'')).status).toBe(400);expect(h.calls).toHaveLength(0);
  expect((await h.callback(url,binding)).status).toBe(303);expect(h.calls).toHaveLength(0); // callback cannot bind an account
  expect((await h.callback(url,binding)).status).toBe(400);
  expect((await h.request('/api/connections/x1/complete','POST',binding,{})).status).toBe(401);
  expect((await h.request('/api/connections/x1/complete','POST',`${binding}; __Host-second-look=${h.otherSession}`,{})).status).toBe(404);
  const result=await h.request('/api/connections/x1/complete','POST',`${binding}; ${h.sessionCookie}`,{});expect(result.status).toBe(200);
  expect(JSON.stringify(await result.json())).not.toContain(accessToken);
  const verifier=h.calls[0].get('code_verifier')!;expect(createHash('sha256').update(verifier).digest('base64url')).toBe(url.searchParams.get('code_challenge'));
  expect(h.validate).toHaveBeenCalledWith(accessToken);expect(await h.oauth.credential(h.caseId,h.owner.id)).toBe(accessToken);
  expect(JSON.stringify(h.store.db.prepare('SELECT * FROM x1_connections').all())).not.toContain(accessToken);
  expect(JSON.stringify(h.store.db.prepare('SELECT * FROM x1_connections').all())).not.toContain(refreshToken);
  expect((await h.request('/api/connections/x1/complete','POST',`${binding}; ${h.sessionCookie}`,{})).status).toBe(409);
  expect(h.calls).toHaveLength(1);
  const disconnected=await h.oauth.disconnect(h.caseId,h.owner.id);expect(disconnected.notice).toContain('revoked');expect(h.calls[1].get('token')).toBe(refreshToken);
  expect(h.connections.metadata(h.caseId,h.owner.id)).toBeUndefined();
 }finally{await h.close();}
});
it('refuses expiry, issuer substitution, a new session for the same user and cancelled connection',async()=>{
 const h=await harness();try{
  let {url,binding}=await h.start();
  const bad=new URLSearchParams({state:url.searchParams.get('state')!,iss:'https://evil.test',code:'fake'});
  expect((await h.request('/api/connections/x1/callback?'+bad,'GET',binding)).status).toBe(400);
  h.store.db.prepare('UPDATE x1_oauth_pending SET expires=0').run();expect((await h.callback(url,binding)).status).toBe(400);
  ({url,binding}=await h.start());await h.callback(url,binding);
  const fresh=h.access.startSession(h.owner.id);
  expect((await h.request('/api/connections/x1/complete','POST',`${binding}; __Host-second-look=${fresh}`,{})).status).toBe(403);
  await h.oauth.disconnect(h.caseId,h.owner.id);
  expect((await h.request('/api/connections/x1/complete','POST',`${binding}; ${h.sessionCookie}`,{})).status).toBe(409);expect(h.calls).toHaveLength(0);
 }finally{await h.close();}
});
it('does not resurrect a connection when disconnect races authorization exchange',async()=>{
 const h=await harness();try{
  const {url,binding}=await h.start();await h.callback(url,binding);
  let release!:()=>void;h.setWait(new Promise<void>(r=>release=r));
  const pending=h.request('/api/connections/x1/complete','POST',`${binding}; ${h.sessionCookie}`,{});
  await vi.waitFor(()=>expect(h.calls).toHaveLength(1));await h.oauth.disconnect(h.caseId,h.owner.id);h.setWait();release();
  expect((await pending).status).toBe(409);expect(h.connections.metadata(h.caseId,h.owner.id)).toBeUndefined();expect(h.calls.at(-1)?.get('token')).toBe(refreshToken);
 }finally{await h.close();}
});
it('shares a token refresh and refuses a refreshed result after disconnect',async()=>{
 const h=await harness();try{
  h.connections.save(h.caseId,h.owner.id,JSON.stringify({kind:'oauth',accessToken,refreshToken,expiresAt:0}));
  let release!:()=>void;h.setWait(new Promise<void>(r=>release=r));
  const one=h.oauth.credential(h.caseId,h.owner.id),two=h.oauth.credential(h.caseId,h.owner.id);
  const results=Promise.allSettled([one,two]);await vi.waitFor(()=>expect(h.calls).toHaveLength(1));
  h.connections.disconnect(h.caseId,h.owner.id);h.setWait();release();
  expect((await results).every(r=>r.status==='rejected')).toBe(true);expect(h.connections.metadata(h.caseId,h.owner.id)).toBeUndefined();
  expect(h.calls).toHaveLength(2);expect(h.calls[0].get('grant_type')).toBe('refresh_token');expect(h.calls[1].get('token')).toBe(refreshToken);
 }finally{await h.close();}
});
it('refreshes an expired OAuth credential while preserving its connection version',async()=>{
 const h=await harness();try{
  const before=h.connections.save(h.caseId,h.owner.id,JSON.stringify({kind:'oauth',accessToken,refreshToken,expiresAt:0}));
  expect(await h.oauth.credential(h.caseId,h.owner.id)).toBe(accessToken);expect(h.connections.metadata(h.caseId,h.owner.id)?.version).toBe(before.version);
  expect(await h.oauth.credential(h.caseId,h.owner.id)).toBe(accessToken);expect(h.calls).toHaveLength(1);
 }finally{await h.close();}
});
