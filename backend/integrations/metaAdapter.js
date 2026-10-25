/**
 * metaAdapter.js
 *
 * Provider boundary for Meta (Facebook / Instagram) Graph API.
 */

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

// ─── Fixture data (NODE_ENV === 'test' only) ─────────────────────────────────
const FIXTURE_MEDIA_ITEMS = [];
const FIXTURE_INSIGHTS = {};

// ─── Internal helpers ────────────────────────────────────────────────────────
function assertFixtureModeAllowed() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('[metaAdapter] Fixture mode is only permitted when NODE_ENV=test.');
  }
}

function bearerHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

// V2 FIX: Unstoppable Promise.race timeout. Guarantees the worker will NEVER hang.
async function graphGet(path, accessToken, query = {}, timeoutMs = 15000) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error(`Meta Graph API timeout after ${timeoutMs}ms for ${path}`);
      err.code = 'GRAPH_API_TIMEOUT';
      err.retryable = true;
      reject(err);
    }, timeoutMs);
  });

  const fetchPromise = fetch(url.toString(), {
    headers: bearerHeaders(accessToken),
  }).then(async (response) => {
    const json = await response.json();
    if (!response.ok || json.error) {
      const err = new Error(json.error?.message || `Graph API request failed: ${response.status}`);
      err.code = json.error?.type || 'GRAPH_API_ERROR';
      err.graphErrorCode = json.error?.code;
      throw err;
    }
    return json;
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 exports
// ─────────────────────────────────────────────────────────────────────────────
function generateAuthUrl(state) {
  const redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:5173/onboarding/connect';
  return (
    `https://api.instagram.com/oauth/authorize` +
    `?client_id=${process.env.META_APP_ID || 'mock_client'}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=instagram_business_basic,instagram_business_manage_insights` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}`
  );
}

async function exchangeCodeForToken(code) {
  // Implementation omitted for brevity in test mode
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  const shortLivedUrl = new URL(`https://api.instagram.com/oauth/access_token`);
  const shortParams = new URLSearchParams();
  shortParams.append('client_id', appId);
  shortParams.append('client_secret', appSecret);
  shortParams.append('grant_type', 'authorization_code');
  shortParams.append('redirect_uri', redirectUri);
  shortParams.append('code', code);

  const shortRes = await fetch(shortLivedUrl.toString(), { method: 'POST', body: shortParams });
  const shortJson = await shortRes.json();
  if (!shortRes.ok || shortJson.error) throw new Error('Token exchange failed');

  const longLivedUrl = new URL(`https://graph.instagram.com/access_token`);
  longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longLivedUrl.searchParams.set('client_secret', appSecret);
  longLivedUrl.searchParams.set('access_token', shortJson.access_token);

  const longRes = await fetch(longLivedUrl.toString());
  const longJson = await longRes.json();
  if (!longRes.ok || longJson.error) throw new Error('Long-lived token exchange failed');

  return { accessToken: longJson.access_token, expiresIn: longJson.expires_in ?? 60 * 60 * 24 * 60 };
}

async function fetchProfile(accessToken) {
  const data = await graphGet('/me', accessToken, {
    fields: 'id,name,username,account_type,profile_picture_url,followers_count',
  });
  return {
    platform: 'INSTAGRAM',
    externalAccountId: data.id,
    username: data.username || data.name,
    accountType: data.account_type || 'BUSINESS',
    profilePictureUrl: data.profile_picture_url || null,
    followersCount: data.followers_count || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 exports
// ─────────────────────────────────────────────────────────────────────────────
async function fetchUserMedia(accessToken, igUserId, { limit = 25, after = null } = {}) {
  const fields = [
    'id', 'caption', 'media_type', 'media_product_type', 'permalink',
    'timestamp', 'thumbnail_url', 'media_url', 'children{id,media_type,media_url}',
  ].join(',');

  const query = { fields, limit: Math.min(limit, 100) };
  if (after) query.after = after;
  const data = await graphGet(`/${igUserId}/media`, accessToken, query);
  return { items: (data.data || []).map(_normaliseMediaItem), nextCursor: data.paging?.cursors?.after ?? null };
}

async function fetchMediaDetail(accessToken, mediaId) {
  const fields = [
    'id', 'caption', 'media_type', 'permalink', 'timestamp',
    'thumbnail_url', 'media_url', 'children{id,media_type,media_url}',
  ].join(',');
  const data = await graphGet(`/${mediaId}`, accessToken, { fields });
  return _normaliseMediaItem(data);
}

async function fetchMediaInsights(accessToken, mediaId, mediaType = 'IMAGE') {
  const isVideoOrReel = mediaType === 'VIDEO' || mediaType === 'REEL' || mediaType === 'REELS';
  const isCarousel = mediaType === 'CAROUSEL' || mediaType === 'CAROUSEL_ALBUM';

  // V2 FIX: Strictly define safe metrics to avoid Meta rejecting the request entirely
  let REQUESTED_METRICS;
  if (isVideoOrReel) {
    REQUESTED_METRICS = 'views,reach,likes,comments,saved,shares,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time';
  } else if (isCarousel) {
    REQUESTED_METRICS = 'carousel_album_impressions,carousel_album_reach,carousel_album_engagement,saved';
  } else {
    REQUESTED_METRICS = 'impressions,reach,likes,comments,saved,shares,total_interactions';
  }

  console.log(`[metaAdapter] Fetching insights for ${mediaType} (${mediaId})...`);

  try {
    const data = await graphGet(`/${mediaId}/insights`, accessToken, { metric: REQUESTED_METRICS });
    console.log(`[metaAdapter] Successfully fetched insights for ${mediaId}`);
    return _normaliseInsights(data.data, isCarousel);
  } catch (err) {
    console.warn(`[metaAdapter] Primary fetch failed for ${mediaId}: ${err.message}. Triggering ultra-safe fallback...`);

    // Absolute worst-case scenario: Just get likes and comments so the pipeline doesn't die.
    try {
      const safeData = await graphGet(`/${mediaId}/insights`, accessToken, { metric: 'likes,comments' });
      console.log(`[metaAdapter] Successfully fetched fallback insights for ${mediaId}`);
      return _normaliseInsights(safeData.data, false);
    } catch (fallbackErr) {
      console.error(`[metaAdapter] ALL metric fetches failed for ${mediaId}`);
      throw fallbackErr;
    }
  }
}

// ─── Phase 4A exports ────────────────────────────────────────────────────────
async function fetchAccountInsights(accessToken, igUserId, { metric, period, breakdown, since, until }) {
  const query = { metric, period };
  if (breakdown) query.breakdown = breakdown;
  if (since) query.since = since;
  if (until) query.until = until;

  const response = await graphGet(`/${igUserId}/insights`, accessToken, query);
  if (!response.data || response.data.length === 0) return { data: [], isSupported: true };
  return { data: response.data.map(_normaliseAccountInsightsItem), isSupported: true };
}

// ─── Normalisation helpers ───────────────────────────────────────────────────
function _normaliseMediaItem(raw) {
  const typeMap = { REEL: 'REEL', IMAGE: 'IMAGE', CAROUSEL_ALBUM: 'CAROUSEL', VIDEO: 'VIDEO' };
  let type = typeMap[raw.media_type] || 'OTHER';
  if (type === 'VIDEO' && raw.media_product_type === 'REELS') type = 'REEL';

  return {
    externalContentId: raw.id,
    type,
    caption: raw.caption || null,
    permalink: raw.permalink || null,
    publishedAt: raw.timestamp ? new Date(raw.timestamp) : null,
    mediaUrl: raw.media_url || null,
    thumbnailUrl: raw.thumbnail_url || null,
    children: Array.isArray(raw.children?.data) ? raw.children.data.map(c => ({
      externalMediaId: c.id,
      mediaType: typeMap[c.media_type] || 'OTHER',
      mediaUrl: c.media_url || null,
    })) : [],
  };
}

function _normaliseInsights(insightsArray, isCarousel = false) {
  const rawPayload = {};
  const lookup = {};

  for (const item of insightsArray) {
    const value = item?.values?.[0]?.value ?? null;
    lookup[item.name] = value;
    rawPayload[item.name] = value;
  }

  // V2 FIX: Properly map carousel-specific metrics back to standard naming
  return {
    reach: _safeInt(lookup.reach ?? lookup.carousel_album_reach),
    impressions: _safeInt(lookup.impressions ?? lookup.carousel_album_impressions),
    plays: _safeInt(lookup.plays ?? lookup.video_views ?? lookup.views),
    likes: _safeInt(lookup.likes),
    comments: _safeInt(lookup.comments),
    saves: _safeInt(lookup.saved),
    shares: _safeInt(lookup.shares),
    totalInteractions: _safeInt(lookup.total_interactions ?? lookup.carousel_album_engagement),
    igReelsAvgWatchTime: _safeInt(lookup.ig_reels_avg_watch_time),
    igReelsVideoViewTotalTime: _safeInt(lookup.ig_reels_video_view_total_time),
    reelsSkipRate: _safeFloat(lookup.reels_skip_rate),
    rawPayload,
  };
}

function _normaliseAccountInsightsItem(item) {
  const sanitizedMeta = {
    id: item.id || null, name: item.name || null, period: item.period || null,
    title: item.title || null, description: item.description || null
  };

  let values = [];
  if (Array.isArray(item.values)) {
    values = item.values.map(v => ({ value: _safeFloat(v.value), endTime: v.end_time || null }));
  } else if (item.total_value) {
    values = [{ value: _safeFloat(item.total_value.value), endTime: item.total_value.end_time || null }];
  }

  const rawBreakdowns = Array.isArray(item.breakdowns) ? item.breakdowns :
    (item.total_value && Array.isArray(item.total_value.breakdowns) ? item.total_value.breakdowns : []);

  const breakdowns = rawBreakdowns.map(b => ({
    dimension_keys: b.dimension_keys || [],
    results: Array.isArray(b.results) ? b.results.map(r => ({
      dimension_values: r.dimension_values || [], value: _safeFloat(r.value), endTime: r.end_time || null
    })) : []
  }));

  return { metricName: item.name, period: item.period, values, breakdowns, rawPayload: sanitizedMeta };
}

function _safeFloat(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function _safeInt(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export {
  generateAuthUrl, exchangeCodeForToken, fetchProfile, fetchUserMedia,
  fetchMediaDetail, fetchMediaInsights, fetchAccountInsights,
  GRAPH_API_VERSION, _normaliseMediaItem, _normaliseInsights, _normaliseAccountInsightsItem,
};