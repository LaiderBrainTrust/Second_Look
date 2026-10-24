import type { X1OAuth } from './x1-oauth.js';
import { Router, type Response } from 'express';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { X1Evidence } from '../shared/funding.js';
import { DomainError } from './domain.js';
import type { CaseStore } from './store.js';
import type { WorkspaceAccess } from './workspace-access.js';
import type { X1Connections } from './x1-connections.js';
const endpoint='https://mcp.x1wealth.com/mcp';
const matchSchema=z.object({ref:z.string().min(1).max(500),label:z.string().max(500),snippet:z.string().max(16000).nullable(),page:z.number().int().positive().nullable(),sourceDate:z.string().max(100).nullable()});
const resultSchema=z.object({matches:z.array(matchSchema).max(20)});
const evidenceMarker='<<<X1_UNTRUSTED_DOCUMENT_EVIDENCE_JSON_V1>>>';
const evidenceEnd='<<<END_X1_UNTRUSTED_DOCUMENT_EVIDENCE_JSON_V1>>>';
const quotedEvidenceSchema=z.object({
 contractId:z.literal('vault-evidence-trust-v1'),contractVersion:z.literal(1),
 instructionSemantics:z.literal('quoted_data_only'),mutationAuthority:z.literal('none'),trustClass:z.literal('untrusted_document_content'),
 document:z.object({documentId:z.string(),documentName:z.string().min(1).max(500),snippet:z.string().min(1).max(16000)}),
});
function displayPassage(match:z.infer<typeof matchSchema>) {
 const snippet=match.snippet!;
 if(!snippet.includes(evidenceMarker))return {label:match.label,snippet};
 try {
  const start=snippet.indexOf(evidenceMarker)+evidenceMarker.length;
  const end=snippet.indexOf(evidenceEnd,start);
  if(end<start)throw Error('Missing evidence boundary');
  const quoted=quotedEvidenceSchema.parse(JSON.parse(snippet.slice(start,end)));
  if(quoted.document.documentId!==match.ref)throw Error('Source mismatch');
  // Decode only X1's typed data envelope. Quoted prose never becomes a command.
  return {label:quoted.document.documentName,snippet:quoted.document.snippet};
 }catch{throw new DomainError(502,'X1 returned an unsupported evidence envelope. No excerpt was imported.');}
}
export function parseX1Evidence(result:unknown,query:string,retrievedAt=new Date().toISOString()):X1Evidence[] {
 const envelope=z.object({isError:z.boolean().optional(),structuredContent:z.unknown().optional(),content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional()}).parse(result);
 if(envelope.isError)throw new DomainError(502,'X1 could not complete this read. Check the dedicated account access.');
 let value=envelope.structuredContent;
 if(!value){const text=envelope.content?.find(c=>c.type==='text')?.text;try{value=text?JSON.parse(text):undefined;}catch{throw new DomainError(502,'X1 did not return structured passage evidence. No excerpt was imported.');}}
 const parsed=resultSchema.safeParse(value);
 if(!parsed.success)throw new DomainError(502,'X1 returned an unsupported passage format. No excerpt was imported.');
 return parsed.data.matches.filter(m=>m.snippet?.trim()).slice(0,3).map(m=>({ref:m.ref,...displayPassage(m),page:m.page,sourceDate:m.sourceDate,retrievedAt,query,contentHash:createHash('sha256').update(JSON.stringify(m)).digest('hex'),origin:'x1_mcp'}));
}
async function withX1<T>(key:string, operation:(client:Client)=>Promise<T>):Promise<T> {
 const client=new Client({name:'second-look-read-only',version:'0.1.0'});
 const transport=new StreamableHTTPClientTransport(new URL(endpoint),{requestInit:{headers:{Authorization:`Bearer ${key}`}},fetch:async(url,init)=>{
  if(new URL(String(url)).origin!=='https://mcp.x1wealth.com')throw new Error('Unexpected X1 destination');
  return fetch(url, {...init,redirect:'error',signal:AbortSignal.timeout(12000)});
 }});
 try { await client.connect(transport); return await operation(client); }
 catch(e){if(e instanceof DomainError)throw e;throw new DomainError(502,'X1 could not complete the request. Check or reconnect your X1 key; no excerpt was imported.');}
 finally{await client.close().catch(()=>{});}
}
export function requireReadOnlyCapabilities(result:unknown) {
 const response=z.object({isError:z.boolean().optional(),structuredContent:z.unknown().optional(),content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional()}).parse(result);
 let value=response.structuredContent;
 if(!value) {try{value=JSON.parse(response.content?.find(c=>c.type==='text')?.text??'null');}catch{value=null;}}
 const caps=z.object({mcp:z.object({canRead:z.literal(true),scopes:z.tuple([z.literal('mcp:read')]),currentSurface:z.object({documents:z.object({canSearchMyDocumentContents:z.literal(true)})})})}).safeParse(value);
 if(response.isError||!caps.success)throw new DomainError(403,'Use a read-only X1 key with access to your own document passages.');
}
export async function validateX1Key(key:string) {
 await withX1(key,async client=>{requireReadOnlyCapabilities(await client.callTool({name:'get_user_capabilities',arguments:{}}));});
}
export async function readX1(query:string,key=process.env.X1_API_KEY):Promise<X1Evidence[]> {
 if(!key)throw new DomainError(503,'X1 is not connected for this case.');
 return withX1(key,async client=>{
  let cursor:string|undefined;let found=false;
  for(let i=0;i<8;i++){const list=await client.listTools(cursor?{cursor}:{});found ||=list.tools.some(t=>t.name==='search_my_document_contents');cursor=list.nextCursor;if(found||!cursor)break;}
  if(!found)throw new DomainError(403,'This X1 connection does not expose own-document passage search.');
  // Tool discovery does not grant access: X1 rechecks the account and each source.
  return parseX1Evidence(await client.callTool({name:'search_my_document_contents',arguments:{query,limit:3}}),query);
 });
}
export function x1Router(store:CaseStore,reader=readX1,personal?:{access:WorkspaceAccess;connections:X1Connections;oauth?:X1OAuth;validate?:(key:string)=>Promise<void>}) {
 const router=Router();let active=false;let window=0;let count=0;
 const previews=new Map<string,{revision:number;actor:string;connectionVersion:string;evidence:X1Evidence;expires:number}>();
 router.use((_q,r,next)=>{if(r.locals.role!=='lp'){r.status(403).json({error:'X1 source evidence is private to the investor.'});return;}r.setHeader('Cache-Control','no-store');next();});
 const caseId=store.read().id;
 const identity=(r:Response)=>{
  if(!personal)return undefined;
  if(r.locals.session?.mode!=='account')throw new DomainError(401,'Sign in to your individual account.');
  const userId=r.locals.session.user.id as string;
  personal.access.requireOwner(caseId,userId);
  return userId;
 };
 const current=(r:Response)=>{
  const userId=identity(r);
  if(personal&&userId)return personal.connections.metadata(caseId,userId)?.version;
  return process.env.X1_API_KEY && process.env.X1_CASE_ID===caseId ? createHash('sha256').update(process.env.X1_API_KEY).digest('hex'):undefined;
 };
 router.get('/',(_q,r)=>{const version=current(r);r.json({configured:Boolean(version),mode:version?(personal?'individual_case_read_only':'dedicated_case_read_only'):'not_connected',canConnect:Boolean(personal?.connections.ready()),canConnectOAuth:Boolean(personal?.oauth?.ready()),evidence:store.read().diligence?.x1Evidence??[]});});
 router.post('/authorize',(_q,r,next)=>{try{if(Date.now()-window>60000){window=Date.now();count=0;}if(++count>6)throw new DomainError(429,'Wait one minute before reconnecting X1.');if(!personal?.oauth)throw new DomainError(503,'X1 browser connection is not enabled.');r.json(personal.oauth.begin(r,caseId));}catch(e){next(e);}});
 let connecting=false;let connectionEpoch=0;
 router.post('/connection',async(q,r,next)=>{
  try{
   const userId=identity(r);
   if(!personal||!userId)throw new DomainError(403,'Connect X1 from a case in your individual account.');
   if(!personal.connections.ready())throw new DomainError(503,'Individual X1 connections are not enabled on this server yet.');
   if(current(r))throw new DomainError(409,'Disconnect the current X1 connection before replacing its key.');
   const key=z.string().trim().regex(/^x1k_[A-Za-z0-9_-]{16,500}$/).safeParse(q.body?.key);
   if(!key.success)throw new DomainError(400,'Paste a read-only X1 API key.');
   if(connecting)throw new DomainError(429,'An X1 connection check is already running.');
   if(Date.now()-window>60000){window=Date.now();count=0;}if(++count>6)throw new DomainError(429,'Wait one minute before another X1 connection check.');
   connecting=true;
   const before=current(r);const epoch=connectionEpoch;const savedEpoch=personal.connections.epoch(caseId,userId);
   try{
    await (personal.validate??validateX1Key)(key.data);
    if(current(r)!==before||connectionEpoch!==epoch||personal.connections.epoch(caseId,userId)!==savedEpoch)throw new DomainError(409,'Your X1 connection changed. Try connecting again.');
    personal.connections.save(caseId,userId,key.data);connectionEpoch++;previews.clear();
    r.json({configured:true,mode:'individual_case_read_only'});
   }finally{connecting=false;}
  }catch(e){next(e);}
 });
 router.post('/disconnect',async(_q,r,next)=>{
  try{const userId=identity(r);if(!personal||!userId)throw new DomainError(403,'Disconnect X1 from your individual case.');
   connectionEpoch++;previews.clear();
   if(personal.oauth){r.json(await personal.oauth.disconnect(caseId,userId));return;}
   personal.connections.disconnect(caseId,userId);
   r.json({configured:false,notice:'Disconnected. Previously copied excerpts remain in the case history. Revoke the key in X1 to stop its use elsewhere.'});
  }catch(e){next(e);}
 });
 router.post('/search',async(q,r,next)=>{
  try{
   const connectionVersion=current(r);
   if(!connectionVersion)throw new DomainError(503,'Connect X1 for this case before searching.');
   store.current(q.body?.expectedRevision);
   const query=z.string().trim().min(3).max(300).safeParse(q.body?.query);if(!query.success)throw new DomainError(400,'Enter a search of 3–300 characters.');
   if(active)throw new DomainError(429,'An X1 search is already running.');
   if(Date.now()-window>60000){window=Date.now();count=0;}if(++count>6)throw new DomainError(429,'Wait one minute before another X1 search.');
   active=true;
   try{
    const key=personal?(personal.oauth?await personal.oauth.credential(caseId,identity(r)!):personal.connections.read(caseId,identity(r)!).key):undefined;
    const results=await reader(query.data,key);const revision=q.body.expectedRevision;store.current(revision);
    if(current(r)!==connectionVersion)throw new DomainError(409,'X1 was disconnected or changed during the search. Search again.');
    const now=Date.now();for(const [k,v] of previews)if(v.expires<now)previews.delete(k);
    if(previews.size>60)throw new DomainError(429,'Too many saved previews. Wait before searching again.');
    const matches=results.map(evidence=>{const selectionId=crypto.randomUUID();previews.set(selectionId,{revision,connectionVersion,actor:r.locals.actor?.userId??'presenter',evidence,expires:now+15*60000});return {selectionId,...evidence};});
    r.json({revision,matches,notice:'Selected excerpts are copied into this case only when you import them. Search did not change financial inputs.'});
   }finally{active=false;}
  }catch(e){next(e);}
 });
 router.post('/import',(q,r,next)=>{
  try{
   const connectionVersion=current(r);
   if(!connectionVersion)throw new DomainError(503,'X1 connection is unavailable for this case.');
   const p=previews.get(q.body?.selectionId);
   if(!p||p.connectionVersion!==connectionVersion||p.expires<Date.now()||p.actor!==(r.locals.actor?.userId??'presenter'))throw new DomainError(409,'Preview expired. Search X1 again before importing.');
   store.current(q.body?.expectedRevision);if(q.body.expectedRevision!==p.revision)throw new DomainError(409,'Case changed. Search again against current terms.');
   const state=store.diligenceCommand('lp',p.revision,{kind:'attach_x1_evidence',evidence:p.evidence},r.locals.actor);
   previews.delete(q.body.selectionId);r.json({revision:state.revision,evidence:p.evidence});
  }catch(e){next(e);}
 });
 return router;
}
