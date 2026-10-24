import { Router } from 'express';
import type { CaseState } from '../shared/contracts.js';
import type { FundingAnalysis } from '../shared/funding.js';
import type { CaseStore } from './store.js';
export function analyzeFunding(state:CaseState, now=new Date()):FundingAnalysis {
 const f=state.diligence?.funding ?? null;
 const result:FundingAnalysis={caseId:state.id,revision:state.revision,funding:f,evidence:state.diligence?.x1Evidence ?? [],blockers:[],cashGapCents:null,offers:[],assumptions:'USD planning scenario from entered facts, not a sale recommendation or promise of settlement. Cash must be unrestricted, uncommitted and usable by this same entity. All offer fees and adjustments are assumed payable with the purchase payment. Taxes, financing and execution risk are excluded. X1 excerpts are dated copies, not verified legal ownership or a live balance.'};
 if(!f) {result.blockers.push('Enter the funding amount, date and owning entity.');return result;}
 if(f.ownerEntity.trim().toLowerCase()!==state.ownerEntity.trim().toLowerCase())result.blockers.push('Funding entity differs from the case owner. Do not assume cash can move between them.');
 if(f.availableCashCents===null || !f.cashConfirmedForThisEntity)result.blockers.push('Confirm available, unrestricted and uncommitted cash for this entity.');
 const today=now.toISOString().slice(0,10);
 if(!f.cashAsOf || f.cashAsOf>today || Date.parse(today)-Date.parse(f.cashAsOf)>7*86400000)result.blockers.push('Cash needs an as-of date within the last seven days; refresh the amount.');
 if(f.neededBy<today)result.blockers.push('The funding deadline has passed. Update the need before comparing.');
 if(!result.blockers.length)result.cashGapCents=Math.max(0,f.amountCents-f.availableCashCents!);
 for(const o of state.diligence?.offers ?? []) {
  if(o.withdrawn)continue;
  const reasons=[...result.blockers];let proceeds=0;
  if(o.expiresAt && Date.parse(o.expiresAt)<=now.getTime())reasons.push('Offer expired.');
  if(o.priceAdjustmentCents===null || o.sellerFeesCents===null)reasons.push('Confirm the price adjustment and seller fees.');
  if(!o.recordDate)reasons.push('Offer record date is unknown.');
  if(!o.paymentDate)reasons.push('Purchase payment date is unknown.');
  else if(o.paymentDate<today)reasons.push('Purchase payment date is in the past. Confirm receipt and avoid double-counting available cash.');
  else if(o.paymentDate<=f.neededBy && o.priceAdjustmentCents!==null && o.sellerFeesCents!==null)proceeds+=o.purchasePriceCents+o.priceAdjustmentCents-o.sellerFeesCents;
  if(o.distributionRecipient===null)reasons.push('Distribution entitlement is unknown.');
  if(!state.answer || o.distributionBasisSourceId!==state.answer.source.id)reasons.push('Confirm distribution entitlement against the current manager answer.');
  if(o.distributionRecipient==='seller') {
   if(!o.distributionDate)reasons.push('Retained distribution payment date is unknown.');
   else if(o.distributionDate<today)reasons.push('Distribution date is in the past. Confirm receipt and avoid double-counting available cash.');
   else if(o.distributionDate<=f.neededBy && state.answer && o.distributionBasisSourceId===state.answer.source.id)proceeds+=state.answer.distributionCents;
  }
  const total=reasons.length?null:f.availableCashCents!+proceeds;
  result.offers.push({id:o.id,buyer:o.buyer,status:total===null?'unresolved':total>=f.amountCents?'covers_under_assumptions':'shortfall',cashByDeadlineCents:total,shortfallCents:total===null?null:Math.max(0,f.amountCents-total),reasons});
 }
 return result;
}
export function fundingRouter(store:CaseStore) {
 const router=Router();router.use((_q,r,next)=>{if(r.locals.role!=='lp'){r.status(403).json({error:'Funding context is private to the investor.'});return;}r.setHeader('Cache-Control','no-store');next();});
 router.get('/',(_q,r)=>r.json(analyzeFunding(store.read())));
 return router;
}
