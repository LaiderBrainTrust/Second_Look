import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createSecondLookMcp } from '../../server/mcp.js';
import { seedCase, view } from '../../server/domain.js';
import { emptyDiligence, diligenceView } from '../../server/diligence.js';
import { analyzeDecision } from '../../server/decision.js';
import type { ComparisonOffer } from '../../shared/diligence.js';
const makeOffer = (id:string, buyer:string, price:number, recipient:'seller'|'buyer'):ComparisonOffer => ({id,buyer,version:1,purchasePriceCents:price,priceAdjustmentCents:0,sellerFeesCents:0,distributionRecipient:recipient,distributionBasisSourceId:null,recordDate:'2026-10-24',expiresAt:null,sourceNote:'Synthetic evaluation quote',conditions:'No assessed closing conditions',withdrawn:false});
const state = {...seedCase(),diligence:{...emptyDiligence(),offers:[makeOffer('keep','Retain Capital',70_000_000,'seller'),makeOffer('assign','Headline Capital',76_000_000,'buyer'),makeOffer('dominated','Lower Capital',69_000_000,'seller')]}};
state.answer = {version:1,text:'Synthetic manager response: expected distribution, not a payment receipt.',distributionCents:10_000_000,source:{id:'evaluation-notice',kind:'user',label:'Synthetic manager response'}};
const server = createSecondLookMcp(async (tool,input) => {
  if(tool==='secondlook_read_case') return {role:'lp',scope:'read',case:view(state,'lp'),historyOmitted:true};
  if(tool==='secondlook_compare_offers') return analyzeDecision(state,new Date('2026-10-24T12:00:00Z'));
  if(tool==='secondlook_list_questions') return {revision:state.revision,questions:diligenceView(state,'lp').questions.slice(Number(input.offset ?? 0),Number(input.offset ?? 0)+Number(input.limit ?? 10)),total:0,nextOffset:null};
  throw new Error('Read-only evaluation fixture. Writes are disabled.');
});
await server.connect(new StdioServerTransport());
