import type { GamingHolding, ReviewWindow, SteamEvidence } from '../../shared/gaming.js';

async function getJson(url: URL, fetcher: typeof fetch) {
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Steam request failed (${response.status}).`);
  return response.json();
}
// Retain a bounded, explicitly sampled English-language window; never imply these are all reviews.
export function reviewWindow(raw: unknown, from: string, to: string): ReviewWindow {
  const payload = raw as { response?: { reviews?: unknown[] }; reviews?: unknown[] };
  const data = payload?.response ?? payload;
  if (!Array.isArray(data?.reviews)) throw new Error('Steam did not return review data.');
  const start = Date.parse(from); const end = Date.parse(to);
  const rows = data.reviews.filter((r): r is { voted_up: boolean; review: string; timestamp_created: number; recommendationid: string } => {
    if (!r || typeof r !== 'object') return false;
    const x = r as Record<string, unknown>;
    return typeof x.recommendationid === 'string' && typeof x.voted_up === 'boolean' && typeof x.review === 'string' && typeof x.timestamp_created === 'number'
      && x.timestamp_created * 1000 >= start && x.timestamp_created * 1000 <= end;
  });
  const unique = [...new Map(rows.map(r => [String(r.recommendationid), r])).values()].slice(0, 100);
  const positive = unique.filter(r => r.voted_up).length;
  const excerpts = [...unique.filter(r => !r.voted_up).slice(0, 3), ...unique.filter(r => r.voted_up).slice(0, 2)]
    .map(r => ({ positive: r.voted_up, text: r.review.replace(/\[[^\]]*\]/g, '').split(/\s+/).slice(0, 12).join(' ').slice(0, 180), date: new Date(r.timestamp_created * 1000).toISOString().slice(0, 10) }));
  return { count: unique.length, positive, positivePercent: unique.length ? Math.round(positive / unique.length * 1000) / 10 : null, from, to, excerpts };
}
export async function fetchSteam(holding: GamingHolding, cutoff: string, fetcher: typeof fetch = fetch): Promise<SteamEvidence> {
  const now = new Date(); const boundary = new Date(`${cutoff}T23:59:59.000Z`);
  if (!Number.isFinite(boundary.getTime()) || boundary >= now) throw new Error('Report cutoff must precede today.');
  const before = new Date(boundary.getTime() - 30 * 86400000); const after = new Date(boundary.getTime() + 1000);
  const reviews = async (from: Date, to: Date) => {
    const url = new URL('https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/');
    url.searchParams.set('input_json', JSON.stringify({ appid: holding.appId, filter: 1, languages: ['english'], review_type: 0, purchase_type: 1, num_per_page: 100,
      date_range_start: Math.floor(from.getTime() / 1000), date_range_end: Math.floor(to.getTime() / 1000) }));
    return reviewWindow(await getJson(url, fetcher), from.toISOString(), to.toISOString());
  };
  const detailsUrl = new URL('https://store.steampowered.com/api/appdetails'); detailsUrl.searchParams.set('appids', String(holding.appId)); detailsUrl.searchParams.set('l', 'english');
  const playersUrl = new URL('https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/'); playersUrl.searchParams.set('appid', String(holding.appId));
  const [current, baseline, details, players] = await Promise.allSettled([reviews(after, now), reviews(before, boundary), getJson(detailsUrl, fetcher), getJson(playersUrl, fetcher)]);
  if (current.status === 'rejected' || baseline.status === 'rejected') throw new Error('Steam review windows unavailable. Refresh later; no numbers were invented.');
  const detail = details.status === 'fulfilled' ? details.value?.[holding.appId]?.data : undefined;
  const image = typeof detail?.header_image === 'string' ? detail.header_image : '';
  const playerCount = players.status === 'fulfilled' ? players.value?.response?.player_count : null;
  return { appId: holding.appId, game: typeof detail?.name === 'string' ? detail.name : holding.game,
    developers: Array.isArray(detail?.developers) ? detail.developers.filter((v: unknown) => typeof v === 'string') : [],
    publishers: Array.isArray(detail?.publishers) ? detail.publishers.filter((v: unknown) => typeof v === 'string') : [],
    sourceUrl: `https://store.steampowered.com/app/${holding.appId}/`,
    imageUrl: /^https:\/\/(?:[a-zA-Z0-9-]+\.)*(?:steamstatic\.com|steamcdn-a\.akamaihd\.net)\//.test(image) ? image : undefined,
    retrievedAt: now.toISOString(), current: current.value, baseline: baseline.value,
    deltaPoints: current.value.count >= 20 && baseline.value.count >= 20 ? Math.round((current.value.positivePercent! - baseline.value.positivePercent!) * 10) / 10 : null,
    playersNow: Number.isSafeInteger(playerCount) && playerCount >= 0 ? playerCount : null,
    ...(players.status === 'rejected' ? { playerError: 'Current players unavailable.' } : {}),
  };
}
