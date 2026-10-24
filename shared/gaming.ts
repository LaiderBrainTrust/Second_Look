import type { Finding } from './research.js';

export interface GamingHolding {
  id: string; studio: string; companyId: string; game: string; appId: number;
  fundNavExposurePercent: number; // Entirely fictional share of the example fund NAV.
}
export interface ReviewWindow {
  count: number; positive: number; positivePercent: number | null;
  from: string; to: string; excerpts: { positive: boolean; text: string; date: string }[];
}
export interface SteamEvidence {
  appId: number; game: string; developers: string[]; publishers: string[];
  sourceUrl: string; imageUrl?: string; retrievedAt: string;
  current: ReviewWindow; baseline: ReviewWindow; deltaPoints: number | null;
  playersNow: number | null; playerError?: string;
}
export interface StudioProfile {
  name: string; description: string; website?: string; ownership?: string;
  headcount?: string; foundedYear?: number; retrievedAt: string;
}
export interface HoldingEvidence {
  holding: GamingHolding; steam?: SteamEvidence; news: Finding[];
  profile?: StudioProfile;
  errors: string[]; priority: 'Investigate' | 'Watch' | 'Evidence missing';
  reason: string; rank: number;
}
export interface GamingSnapshot {
  id: string; caseRevision: number; createdAt: string; reportCutoff: string;
  status: 'fetching' | 'ready' | 'blocked'; holdings: HoldingEvidence[]; error?: string;
}
export interface GamingContext {
  holding: GamingHolding; steam?: SteamEvidence; news: Finding[];
  profile?: StudioProfile;
  priority: HoldingEvidence['priority']; reason: string; snapshotId: string;
  ownershipDisclosure: string;
}

export const GAMING_HOLDINGS: GamingHolding[] = [
  { id: 'pounce-light', studio: 'Pounce Light', companyId: '006b6c5', game: 'Tiny Glade', appId: 2198150, fundNavExposurePercent: 45 },
  { id: 'localthunk', studio: 'LocalThunk', companyId: '028vpms', game: 'Balatro', appId: 2379780, fundNavExposurePercent: 35 },
  { id: 'aggro-crab', studio: 'Aggro Crab', companyId: '003zeuz', game: "Another Crab’s Treasure", appId: 1887840, fundNavExposurePercent: 20 },
];
export const GAMING_DISCLOSURE = 'Fictional fund and ownership: none of these studios is represented as an actual fund investment. Exposure percentages are synthetic examples, not reported facts.';
