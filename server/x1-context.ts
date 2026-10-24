import { Router } from 'express';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { X1Evidence } from '../shared/funding.js';
import { DomainError } from './domain.js';
import type { CaseStore } from './store.js';
const endpoint='https://mcp.x1wealth.com/mcp';
const matchSchema=z.object({ref:z.string().min(1).max(500),label:z.string().max(500),snippet:z.string().max(16000).nullable(),page:z.number().int().positive().nullable(),sourceDate:z.string().max(100).nullable()});
const resultSchema=z.object({matches:z.array(matchSchema).max(20)});
export function parseX1Evidence(result:unknown,query:string,retrievedAt=new Date().toISOString()):X1Evidence[] {
 const envelope=z.object({isError:z.boolean().optional(),structuredContent:z.unknown().optional(),content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional()}).parse(result);
 if(envelope.isError)throw new DomainError(502,'X1 could not complete this read. Check the dedicated account access.');
 let value=envelope.structuredContent;
 if(!value){const text=envelope.content?.find(c=>c.type==='text')?.text;try{value=text?JSON.parse(text):undefined;}catch{throw new DomainError(502,'X1 did not return structured passage evidence. No excerpt was imported.');}}
 const parsed=resultSchema.safeParse(value);
 if(!parsed.success)throw new DomainError(502,'X1 returned an unsupported passage format. No excerpt was imported.');
 return parsed.data.matches.filter(m=>m.snippet?.trim()).slice(0,3).map(m=>({ref:m.ref,label:m.label,snippet:m.snippet!,page:m.page,sourceDate:m.sourceDate,retrievedAt,query,contentHash:createHash('sha256').update(JSON.stringify(m)).digest('hex'),origin:'x1_mcp'}));
}
export async function readX1(query:string):Promise<X1Evidence[]> {
 const key=process.env.X1_API_KEY;
 if(!key)throw new DomainError(503,'X1 is not connected. Configure the dedicated demo account before importing evidence.');
 const client=new Client({name:'second-look-read-only',version:'0.1.0'});
 const transport=new StreamableHTTPClientTransport(new URL(endpoint),{requestInit:{headers:{Authorization:`Bearer ${key}`}},fetch:async(url,init)=>{
  if(new URL(String(url)).origin!=='https://mcp.x1wealth.com')throw new Error('Unexpected X1 destination');
  return fetch(url, {...init,redirect:'error',signal:AbortSignal.timeout(12000)});
 }});
 try {
  await client.connect(transport);
  let cursor:string|undefined;let found=false;
  for(let i=0;i<8;i++){const list=await client.listTools(cursor?{cursor}:{});found ||=list.tools.some(t=>t.name==='search_my_document_contents');cursor=list.nextCursor;if(found||!cursor)break;}
  if(!found)throw new DomainError(403,'This X1 connection does not expose own-document passage search.');
  // Tool discovery does not grant access: X1 rechecks the account and each source.
  const result=await client.callTool({name:'search_my_document_contents',arguments:{query,limit:3}});
  return parseX1Evidence(result,query);
 } catch(e){if(e instanceof DomainError)throw e;throw new DomainError(502,'X1 read failed or timed out. No evidence was imported; check the dedicated account connection.');}
 finally{await client.close().catch(()=>{});}
}
export function x1Router(store:CaseStore,reader=readX1) {
 const router=Router();let active=false;let window=0;let count=0;
 const previews=new Map<string,{revision:number;actor:string;evidence:X1Evidence;expires:number}>();
 router.use((_q,r,next)=>{if(r.locals.role!=='lp'){r.status(403).json({error:'X1 source evidence is private to the investor.'});return;}r.setHeader('Cache-Control','no-store');next();});
 const configured=()=>Boolean(process.env.X1_API_KEY && process.env.X1_CASE_ID===store.read().id);
 router.get('/',(_q,r)=>r.json({configured:configured(),mode:configured()?'dedicated_case_read_only':'not_connected',evidence:store.read().diligence?.x1Evidence??[]}));
 router.post('/search',async(q,r,next)=>{
  try{
   if(!configured())throw new DomainError(503,'No dedicated X1 connection is configured for this case.');
   store.current(q.body?.expectedRevision);
   const query=z.string().trim().min(3).max(300).safeParse(q.body?.query);if(!query.success)throw new DomainError(400,'Enter a search of 3–300 characters.');
   if(active)throw new DomainError(429,'An X1 search is already running.');
   if(Date.now()-window>60000){window=Date.now();count=0;}if(++count>6)throw new DomainError(429,'Wait one minute before another X1 search.');
   active=true;
   try{
    const results=await reader(query.data);const revision=q.body.expectedRevision;store.current(revision);
    const now=Date.now();for(const [k,v] of previews)if(v.expires<now)previews.delete(k);
    if(previews.size>60)throw new DomainError(429,'Too many saved previews. Wait before searching again.');
    const matches=results.map(evidence=>{const selectionId=crypto.randomUUID();previews.set(selectionId,{revision,actor:r.locals.actor?.userId??'presenter',evidence,expires:now+15*60000});return {selectionId,...evidence};});
    r.json({revision,matches,notice:'Selected excerpts are copied into this case only when you import them. Search did not change financial inputs.'});
   }finally{active=false;}
  }catch(e){next(e);}
 });
 router.post('/import',(q,r,next)=>{
  try{
   if(!configured())throw new DomainError(503,'X1 connection is unavailable for this case.');
   const p=previews.get(q.body?.selectionId);
   if(!p||p.expires<Date.now()||p.actor!==(r.locals.actor?.userId??'presenter'))throw new DomainError(409,'Preview expired. Search X1 again before importing.');
   store.current(q.body?.expectedRevision);if(q.body.expectedRevision!==p.revision)throw new DomainError(409,'Case changed. Search again against current terms.');
   const state=store.diligenceCommand('lp',p.revision,{kind:'attach_x1_evidence',evidence:p.evidence},r.locals.actor);
   previews.delete(q.body.selectionId);r.json({revision:state.revision,evidence:p.evidence});
  }catch(e){next(e);}
 });
 return router;
}
