import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { afterEach, expect, it, vi } from 'vitest';
import { createStore } from '../server/store.js';
import { createWorkspaceAccess } from '../server/workspace-access.js';
import { createX1Connections } from '../server/x1-connections.js';
import { x1Router, parseX1Evidence, requireReadOnlyCapabilities } from '../server/x1-context.js';
import { createApp } from '../server/app.js';

const syntheticKey='x1k_synthetic_not_a_real_key_for_tests';
const encryption='ab'.repeat(32);
const evidence=()=>parseX1Evidence({structuredContent:{matches:[{ref:'synthetic-doc',label:'Synthetic source',snippet:'A test-only excerpt.',page:1,sourceDate:null}]}},'source');
const createInput=()=>({requestId:randomUUID(),title:'Synthetic case',ownerEntity:'Synthetic entity',reportNote:'Report p1',offerNote:'Quote p1',purchasePriceCents:10000,priceAdjustmentCents:0,distributionRecipient:'seller',question:'What changed?',allowExternalResearch:false});
afterEach(()=>vi.unstubAllEnvs());

it('stores an encrypted owner/case-bound key, survives restart and rejects ciphertext swapping',()=>{
 vi.stubEnv('X1_CONNECTION_ENCRYPTION_KEY',encryption);
 const dir=mkdtempSync(join(tmpdir(),'x1-connection-'));const path=join(dir,'db.sqlite');let store=createStore(path);
 try{
  let connections=createX1Connections(store.db);connections.save('case-a','owner-a',syntheticKey);
  const raw=JSON.stringify(store.db.prepare('SELECT * FROM x1_connections').all());expect(raw).not.toContain(syntheticKey);
  expect(connections.metadata('case-a','owner-b')).toBeUndefined();expect(()=>connections.read('case-b','owner-a')).toThrow();
  store.close();store=createStore(path);connections=createX1Connections(store.db);expect(connections.read('case-a','owner-a').key).toBe(syntheticKey);
  store.db.prepare("UPDATE x1_connections SET user_id='owner-b'").run();expect(()=>connections.read('case-a','owner-b')).toThrow('cannot be opened');
  connections.disconnect('case-a','owner-b');expect(connections.metadata('case-a','owner-b')).toBeUndefined();
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
it('refuses storage without an encryption key and refuses broader or missing X1 scopes',()=>{
 const store=createStore(':memory:');try{
  vi.stubEnv('X1_CONNECTION_ENCRYPTION_KEY','');const c=createX1Connections(store.db);expect(c.ready()).toBe(false);expect(()=>c.save('case','user',syntheticKey)).toThrow('not enabled');
  const caps=(scopes:string[])=>({structuredContent:{mcp:{canRead:true,scopes,currentSurface:{documents:{canSearchMyDocumentContents:true}}}}});
  expect(()=>requireReadOnlyCapabilities(caps(['mcp:read']))).not.toThrow();
  expect(()=>requireReadOnlyCapabilities(caps(['mcp:read','mcp:write']))).toThrow('read-only');
  expect(()=>requireReadOnlyCapabilities(caps([]))).toThrow('read-only');
 }finally{store.close();}
});
it('isolates individual connections and invalidates previews and in-flight reads on disconnect',async()=>{
 vi.stubEnv('X1_CONNECTION_ENCRYPTION_KEY',encryption);vi.stubEnv('X1_API_KEY','global-synthetic-key');vi.stubEnv('X1_CASE_ID','sample-fund');
 const store=createStore(':memory:');const access=createWorkspaceAccess(store.db);const connections=createX1Connections(store.db);
 const owner=access.register({handle:'owner',displayName:'Owner',password:'synthetic long test password'});
 const stranger=access.register({handle:'stranger',displayName:'Stranger',password:'synthetic long test password'});
 const state=access.createCase(owner.id,createInput());const other=access.createCase(stranger.id,createInput());
 const gp=access.register({handle:'manager',displayName:'Manager',password:'synthetic long test password'});
 store.db.prepare('INSERT INTO workspace_members VALUES (?,?,?)').run(state.id,gp.id,'gp');
 const sessions={owner:access.startSession(owner.id),stranger:access.startSession(stranger.id),gp:access.startSession(gp.id)};
 let readWait:Promise<void>|undefined;let validateWait:Promise<void>|undefined;
 const reader=vi.fn(async(_query:string,key?:string)=>{expect(key).toBe(syntheticKey);await readWait;return evidence();});
 const validate=vi.fn(async()=>{await validateWait;});
 const app=express();app.use(express.json());app.use((req,res,next)=>{res.locals.session=access.session(req.header('x-test-session')??'');next();});
 for(const id of [state.id,other.id])app.use(`/cases/${id}`,(req,res,next)=>{try{if(!res.locals.session)return res.status(401).end();res.locals.actor=access.membership(id,res.locals.session.user.id);res.locals.role=res.locals.actor.role;next();}catch(e){next(e);}},x1Router(store.forCase(id),reader,{access,connections,validate}));
 app.use((e:any,_q:any,r:any,_n:any)=>r.status(e.status??500).json({error:e.status?e.message:'Failed'}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const request=async(path:string,body?:unknown,actor:keyof typeof sessions='owner',id=state.id)=>{const r=await fetch(`${base}/cases/${id}${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-test-session':sessions[actor]},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};};
 try{
  expect((await request('')).data.configured).toBe(false); // never inherits the presentation key
  expect((await request('/connection',{key:syntheticKey},'stranger')).status).toBe(404);
  expect((await request('/connection',{key:syntheticKey},'gp')).status).toBe(403);expect(validate).not.toHaveBeenCalled();
  expect((await request('/connection',{key:syntheticKey})).status).toBe(200);
  const metadata=await request('');expect(metadata.data.mode).toBe('individual_case_read_only');expect(JSON.stringify(metadata)).not.toContain(syntheticKey);
  expect((await request('',undefined,'stranger',other.id)).status).toBe(200);
  expect((await request('/search',{query:'source',expectedRevision:1},'stranger',other.id)).status).toBe(503);
  const preview=await request('/search',{query:'source',expectedRevision:1});expect(preview.status).toBe(200);
  await request('/disconnect',{});
  expect((await request('/import',{selectionId:preview.data.matches[0].selectionId,expectedRevision:1})).status).toBe(503);
  await request('/connection',{key:syntheticKey});
  expect((await request('/import',{selectionId:preview.data.matches[0].selectionId,expectedRevision:1})).status).toBe(409);
  const fresh=await request('/search',{query:'source',expectedRevision:1});expect((await request('/import',{selectionId:fresh.data.matches[0].selectionId,expectedRevision:1})).status).toBe(200);
  expect(store.forCase(state.id).read().diligence?.funding).toBeUndefined();
  let release!:()=>void;readWait=new Promise<void>(r=>release=r);
  const pending=request('/search',{query:'source',expectedRevision:2});await vi.waitFor(()=>expect(reader).toHaveBeenCalledTimes(3));
  await request('/disconnect',{});release();expect((await pending).status).toBe(409);readWait=undefined;
  expect(store.forCase(state.id).read().diligence?.x1Evidence).toHaveLength(1); // copies remain
  validateWait=new Promise<void>(r=>release=r);const connecting=request('/connection',{key:syntheticKey});await vi.waitFor(()=>expect(validate).toHaveBeenCalledTimes(3));
  await request('/disconnect',{});release();expect((await connecting).status).toBe(409);expect((await request('')).data.configured).toBe(false);
 }finally{await new Promise<void>(r=>server.close(()=>r()));store.close();}
});
it('does not expose connection mutation to anonymous or presenter sessions in the hosted app',async()=>{
 const store=createStore(':memory:');const origin='https://workspace.test';const code='synthetic-registration-code-long-enough';
 const server=createApp(store,{hosted:{origin,accessCode:code}}).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const post=(path:string,body:unknown,cookie='')=>fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
 try{
  expect((await post('/api/case/x1/connection',{key:syntheticKey})).status).toBe(401);
  const login=await post('/api/session/login',{code});const cookie=login.headers.get('set-cookie')!.split(';')[0];
  expect((await post('/api/case/x1/connection',{key:syntheticKey},cookie)).status).toBe(403);
 }finally{await new Promise<void>(r=>server.close(()=>r()));store.close();}
});
