export interface OfferPair {
  offerIds: [string, string];
  status: 'incomplete' | 'conditional' | 'confirmed';
  reasons: string[];
  cashCents: [number, number] | null;
  differenceCents: number | null; // First offer minus second, before tax.
  tieDistributionCents: number | null;
  retainingOfferId: string | null;
}

export interface DecisionAnalysis {
  caseId: string;
  revision: number;
  status: 'incomplete' | 'conditional' | 'confirmed';
  excluded: { offerId: string; reasons: string[] }[];
  eligibleOfferIds: string[];
  offers: { id: string; buyer: string; purchasePriceCents: number; priceAdjustmentCents: number | null; sellerFeesCents: number | null; distributionRecipient: 'seller' | 'buyer' | null; recordDate: string | null; sourceNotePreview: string; sourceNoteTruncated: boolean }[];
  pairs: OfferPair[];
  recordDate: string | null;
  frontier: null | {
    retainingOfferIds: string[];
    assigningOfferIds: string[];
    tieDistributionCents: number;
    withinSupportedRange: boolean;
    explanation: string;
  };
  nextQuestion: null | { owner: 'gp'; text: string; privateReason: string };
  confirmedHighestOfferIds: string[];
  scenarios: { distributionCents: number; highestOfferIds: string[]; netBeforeTaxCents: number }[];
  assumptions: string;
}
