import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {createStore} from '../server/store.js';
import {createApp} from '../server/app.js';
import {createPresenterSessions} from '../server/presenter-sessions.js';
afterEach(()=>vi.restoreAllMocks());
const origin='https://demo.test';
const accessCode='synthetic-access-code-for-session-tests';
it('retains the cookie and selected role across database and API restarts, and persists logout',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'presenter-session-'));
 const file=join(dir,'test.sqlite');let store=createStore(file);
 let server=createApp(store,{hosted:{origin,accessCode}}).listen(0,'127.0.0.1');
 let cookie='';
 const ready=()=>new Promise<void>(resolve=>server.listening?resolve():server.once('listening',resolve));
 const stop=()=>new Promise<void>(resolve=>server.close(()=>resolve()));
 const request=(path:string,body?:unknown)=>{const addr=server.address();if(!addr||typeof addr==='string')throw Error('Missing listener');return fetch(`http://127.0.0.1:${addr.port}${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});};
 try {
  await ready();const login=await request('/api/session/login',{code:accessCode});expect(login.status).toBe(200);cookie=login.headers.get('set-cookie')!.split(';')[0];
  expect((await request('/api/session/role',{role:'gp'})).status).toBe(200);
  await stop();store.close();store=createStore(file);server=createApp(store,{hosted:{origin,accessCode}}).listen(0,'127.0.0.1');await ready();
  expect(await(await request('/api/session')).json()).toMatchObject({authenticated:true,role:'gp',mode:'presenter'});
  expect((await request('/api/case')).status).toBe(200);
  expect((await request('/api/session/logout',{})).status).toBe(200);
  await stop();store.close();store=createStore(file);server=createApp(store,{hosted:{origin,accessCode}}).listen(0,'127.0.0.1');await ready();
  expect((await request('/api/case')).status).toBe(401);
 }finally{await stop();store.close();rmSync(dir,{recursive:true,force:true});}
});
it('stores only hashed tokens and enforces eight-hour expiry and access-code rotation',()=>{
 const store=createStore(':memory:');const now=Date.now();
 try{
  vi.spyOn(Date,'now').mockReturnValue(now);
  const sessions=createPresenterSessions(store.db,accessCode);const token=sessions.issue()!;
  expect(sessions.get(token)).toMatchObject({role:'lp'});
  const rows=store.db.prepare('SELECT * FROM presenter_sessions').all();
  expect(JSON.stringify(rows)).not.toContain(token);expect(JSON.stringify(rows)).not.toContain(accessCode);
  vi.mocked(Date.now).mockReturnValue(now+8*60*60*1000);
  expect(sessions.get(token)).toBeUndefined();
  const second=sessions.issue()!;expect(sessions.get(second)).toBeDefined();
  const rotated=createPresenterSessions(store.db,accessCode+'-rotated');
  expect(rotated.get(second)).toBeUndefined();expect(sessions.get(second)).toBeUndefined();
 }finally{store.close();}
});
