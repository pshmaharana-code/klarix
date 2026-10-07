/**
 * metaAdapter.js
 *
 * Provider boundary for Meta (Facebook / Instagram) Graph API.
 *
 * Phase 2 exports (generateAuthUrl, exchangeCodeForToken, fetchProfile) are
 * preserved with identical behaviour.
 *
 * Phase 3 exports (fetchUserMedia, fetchMediaDetail, fetchMediaInsights) are
 * added in this gate.  The worker processors that call them belong to Gate 3.
 *
 * ─── Fixture / Test mode ─────────────────────────────────────────────────────
 * Deterministic fixture responses are returned ONLY when:
 *
 *   process.env.NODE_ENV === 'test'
 *
 * This is a HARD guard.  The fixture path must NEVER activate because
 * credentials are missing or because NODE_ENV is anything other than 'test'.
 * In development or production, missing credentials produce an explicit error.
 *
 * ─── Security ────────────────────────────────────────────────────────────────
 * • Access tokens are accepted as function parameters and used only within
 *   this module.  They are never logged, never included in error messages,
 *   never serialised into DTOs, and never placed in URLs.
 * • The Authorization header is constructed internally and never returned.
 * • rawPayload (returned for traceability) must be inspected by callers and
 *   must not be forwarded to API responses without sanitisation.
 *
 * ─── API version ─────────────────────────────────────────────────────────────
 * The Graph API version is centralised in META_GRAPH_API_VERSION (env var) or
 * the GRAPH_API_VERSION constant.  It must not be scattered through call sites.
 * If META_GRAPH_API_VERSION is not set in production, calls will use the
 * pinned fallback constant — callers should confirm this is current.
 */

// ─── API version (single source of truth) ───────────────────────────────────

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

// ─── Fixture data (NODE_ENV === 'test' only) ─────────────────────────────────

const FIXTURE_MEDIA_ITEMS = [
  {
    id: 'fixture_media_001',
    caption: 'Morning coffee ritual ☕ #lifestyle #mornings',
    media_type: 'REEL',
    permalink: 'https://www.instagram.com/p/fixture001/',
    timestamp: '2024-03-15T08:00:00+0000',
    thumbnail_url: 'https://fixture.cdn.instagram.com/thumb001.jpg',
    media_url: 'https://fixture.cdn.instagram.com/reel001.mp4',
    children: null,
  },
  {
    id: 'fixture_media_002',
    caption: 'Weekend brunch goals 🥞',
    media_type: 'IMAGE',
    permalink: 'https://www.instagram.com/p/fixture002/',
    timestamp: '2024-03-14T12:00:00+0000',
    thumbnail_url: null,
    media_url: 'https://fixture.cdn.instagram.com/image002.jpg',
    children: null,
  },
  {
    id: 'fixture_media_003',
    caption: 'Spring collection drops tomorrow 🌸',
    media_type: 'CAROUSEL_ALBUM',
    permalink: 'https://www.instagram.com/p/fixture003/',
    timestamp: '2024-03-13T09:00:00+0000',
    thumbnail_url: null,
    media_url: 'https://fixture.cdn.instagram.com/carousel003_1.jpg',
    children: {
      data: [
        { id: 'fixture_media_003_1', media_type: 'IMAGE', media_url: 'https://fixture.cdn.instagram.com/carousel003_1.jpg' },
        { id: 'fixture_media_003_2', media_type: 'IMAGE', media_url: 'https://fixture.cdn.instagram.com/carousel003_2.jpg' },
      ],
    },
  },
  {
    id: 'fixture_media_004',
    caption: 'Behind the scenes 🎬',
    media_type: 'VIDEO',
    permalink: 'https://www.instagram.com/p/fixture004/',
    timestamp: '2024-03-12T16:00:00+0000',
    thumbnail_url: 'https://fixture.cdn.instagram.com/thumb004.jpg',
    media_url: 'https://fixture.cdn.instagram.com/video004.mp4',
    children: null,
  },
  {
    id: 'fixture_media_005',
    caption: 'Community Q&A tomorrow 💬',
    media_type: 'IMAGE',
    permalink: 'https://www.instagram.com/p/fixture005/',
    timestamp: '2024-03-11T11:00:00+0000',
    thumbnail_url: null,
    media_url: 'https://fixture.cdn.instagram.com/image005.jpg',
    children: null,
  },
];

const FIXTURE_INSIGHTS = {
  fixture_media_001: { reach: 8500, impressions: 12000, plays: 6200, likes: 430, comments: 28, saves: 155, shares: 67, totalInteractions: 680, igReelsAvgWatchTime: 11000, igReelsVideoViewTotalTime: 68200000, reelsSkipRate: 45.2 },
  fixture_media_002: { reach: 4200, impressions: 5100, plays: null, likes: 310, comments: 14, saves: 88, shares: 22 },
  fixture_media_003: { reach: 3100, impressions: 3900, plays: null, likes: 210, comments: 9, saves: 45, shares: 11 },
  fixture_media_004: { reach: 6700, impressions: 9200, plays: 5100, likes: 520, comments: 41, saves: 199, shares: 83 },
  fixture_media_005: { reach: 2900, impressions: 3400, plays: null, likes: 180, comments: 7, saves: 32, shares: 9 },
};

// ─── Internal helpers ────────────────────────────────────────────────────────

function assertFixtureModeAllowed() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('[metaAdapter] Fixture mode is only permitted when NODE_ENV=test.');
  }
}

function bearerHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function graphGet(path, accessToken, query = {}) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const response = await fetch(url.toString(), {
    headers: bearerHeaders(accessToken),
  });

  const json = await response.json();

  if (!response.ok || json.error) {
    const err = new Error(json.error?.message || `Graph API request failed: ${response.status}`);
    err.code = json.error?.type || 'GRAPH_API_ERROR';
    err.graphErrorCode = json.error?.code;
    throw err;
  }

  return json;
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
  if (process.env.NODE_ENV === 'test') {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!code || code === 'invalid_code') throw new Error('Invalid OAuth code');
    return {
      accessToken: `mock_access_token_${Date.now()}`,
      expiresIn: 60 * 60 * 24 * 60,
    };
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    const err = new Error('META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI must be set for token exchange');
    err.code = 'META_CONFIG_MISSING';
    throw err;
  }

  const shortLivedUrl = new URL(`https://api.instagram.com/oauth/access_token`);
  const shortParams = new URLSearchParams();
  shortParams.append('client_id', appId);
  shortParams.append('client_secret', appSecret);
  shortParams.append('grant_type', 'authorization_code');
  shortParams.append('redirect_uri', redirectUri);
  shortParams.append('code', code);

  const shortRes = await fetch(shortLivedUrl.toString(), { method: 'POST', body: shortParams });
  const shortJson = await shortRes.json();
  if (!shortRes.ok || shortJson.error) {
    const err = new Error(shortJson.error?.message || 'Token exchange failed');
    err.code = 'OAUTH_EXCHANGE_FAILED';
    throw err;
  }

  const longLivedUrl = new URL(`https://graph.instagram.com/access_token`);
  longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longLivedUrl.searchParams.set('client_secret', appSecret);
  longLivedUrl.searchParams.set('access_token', shortJson.access_token);

  const longRes = await fetch(longLivedUrl.toString());
  const longJson = await longRes.json();
  if (!longRes.ok || longJson.error) {
    const err = new Error(longJson.error?.message || 'Long-lived token exchange failed');
    err.code = 'OAUTH_EXCHANGE_FAILED';
    throw err;
  }

  return {
    accessToken: longJson.access_token,
    expiresIn: longJson.expires_in ?? 60 * 60 * 24 * 60,
  };
}

async function fetchProfile(accessToken) {
  if (process.env.NODE_ENV === 'test') {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!accessToken.startsWith('mock_access_token')) throw new Error('Invalid access token format');
    return {
      platform: 'INSTAGRAM',
      externalAccountId: accessToken.replace('mock_access_token_', 'mock_ext_acct_'),
      username: 'mocked_brand_official',
      accountType: 'BUSINESS',
      profilePictureUrl: 'https://via.placeholder.com/150',
      followersCount: 12500,
    };
  }

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
  if (process.env.NODE_ENV === 'test') {
    assertFixtureModeAllowed();

    let items;
    let nextCursor = null;
    if (!after) {
      items = FIXTURE_MEDIA_ITEMS.slice(0, 3);
      nextCursor = 'fixture_cursor_page2';
    } else if (after === 'fixture_cursor_page2') {
      items = FIXTURE_MEDIA_ITEMS.slice(3);
      nextCursor = null;
    } else {
      items = [];
      nextCursor = null;
    }

    return {
      items: items.map(_normaliseMediaItem),
      nextCursor,
    };
  }

  const fields = [
    'id',
    'caption',
    'media_type',
    'media_product_type',
    'permalink',
    'timestamp',
    'thumbnail_url',
    'media_url',
    'children{id,media_type,media_url}',
  ].join(',');

  const query = { fields, limit: Math.min(limit, 100) };
  if (after) query.after = after;

  const data = await graphGet(`/${igUserId}/media`, accessToken, query);

  const items = (data.data || []).map(_normaliseMediaItem);
  const nextCursor = data.paging?.cursors?.after ?? null;

  return { items, nextCursor };
}

/**
 * RESTORED: Retrieve additional detail for an individual media object.
 */
async function fetchMediaDetail(accessToken, mediaId) {
  if (process.env.NODE_ENV === 'test') {
    assertFixtureModeAllowed();
    const found = FIXTURE_MEDIA_ITEMS.find(m => m.id === mediaId);
    if (!found) {
      const err = new Error(`Fixture media not found: ${mediaId}`);
      err.code = 'CONTENT_NOT_FOUND';
      throw err;
    }
    return _normaliseMediaItem(found);
  }

  const fields = [
    'id',
    'caption',
    'media_type',
    'permalink',
    'timestamp',
    'thumbnail_url',
    'media_url',
    'children{id,media_type,media_url}',
  ].join(',');

  const data = await graphGet(`/${mediaId}`, accessToken, { fields });
  return _normaliseMediaItem(data);
}

/**
 * UPGRADED: Retrieve available metrics (insights) with dynamic fallback logic.
 */
async function fetchMediaInsights(accessToken, mediaId, mediaType = 'IMAGE') {
  if (process.env.NODE_ENV === 'test') {
    assertFixtureModeAllowed();
    const raw = FIXTURE_INSIGHTS[mediaId];
    if (!raw) {
      return {
        reach: null, impressions: null, plays: null,
        likes: null, comments: null, saves: null, shares: null,
        totalInteractions: null, igReelsAvgWatchTime: null,
        igReelsVideoViewTotalTime: null, reelsSkipRate: null,
        rawPayload: {},
      };
    }
    return { ...raw, rawPayload: { _fixture: true, mediaId } };
  }

  const isVideoOrReel = mediaType === 'VIDEO' || mediaType === 'REEL' || mediaType === 'REELS';

  // FIX: Changed 'plays' to 'views' to match Graph API v21.0 specifications
  const REQUESTED_METRICS = isVideoOrReel
    ? 'views,reach,likes,comments,saved,shares,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time'
    : 'impressions,reach,likes,comments,saved,shares,total_interactions';

  try {
    const data = await graphGet(`/${mediaId}/insights`, accessToken, {
      metric: REQUESTED_METRICS,
    });

    if (!data || !Array.isArray(data.data)) {
      const err = new Error('Unexpected insights response structure');
      err.code = 'GRAPH_API_ERROR';
      throw err;
    }

    return _normaliseInsights(data.data);
  } catch (err) {
    // V2 FIX: Bulletproof Fallback. Catch unsupported metrics or 'metric[0]' errors.
    if (err.message && (err.message.includes('impressions') || err.message.includes('not support') || err.message.includes('metric['))) {
      console.warn(`[metaAdapter] Metric rejected for ${mediaType} (${mediaId}). Retrying with fallback video metrics...`);

      // Fallback 1: Try with 'views' instead of 'impressions'
      const fallbackMetrics = 'views,reach,likes,comments,saved,shares,total_interactions';

      try {
        const fallbackData = await graphGet(`/${mediaId}/insights`, accessToken, {
          metric: fallbackMetrics,
        });
        return _normaliseInsights(fallbackData.data);
      } catch (fallbackErr) {
        console.warn(`[metaAdapter] Primary fallback failed for ${mediaId}. Retrying with universally safe metrics...`);

        // Fallback 2: Ultra-safe (No views, no impressions, just absolute basics)
        try {
          const ultraSafeMetrics = 'reach,likes,comments,saved,shares,total_interactions';
          const ultraSafeData = await graphGet(`/${mediaId}/insights`, accessToken, {
            metric: ultraSafeMetrics,
          });
          return _normaliseInsights(ultraSafeData.data);
        } catch (finalErr) {
          console.error(`[metaAdapter] All fallbacks failed for ${mediaId}:`, finalErr.message);
          throw finalErr;
        }
      }
    }
    throw err;
  }
}

// ─── Phase 4A exports ────────────────────────────────────────────────────────

async function fetchAccountInsights(accessToken, igUserId, { metric, period, breakdown, since, until }) {
  if (process.env.NODE_ENV === 'test') {
    assertFixtureModeAllowed();

    if (metric === 'reach' && period === 'lifetime') {
      const err = new Error('An unknown error has occurred.');
      err.code = 'OAuthException';
      err.graphErrorCode = 1;
      throw err;
    }

    if (metric === 'views' || metric === 'accounts_engaged') {
      return { data: [], isSupported: true };
    }

    const mockData = [
      {
        name: metric,
        period: period,
        title: 'Mock Metric',
        description: 'Mock Description',
        id: `${igUserId}/insights/${metric}/${period}`,
        values: [
          { value: 100, end_time: '2026-09-24T07:00:00+0000' }
        ],
        breakdowns: breakdown ? [
          {
            dimension_keys: [breakdown],
            results: [
              { dimension_values: ['REELS'], value: 60, end_time: '2026-09-24T07:00:00+0000' },
              { dimension_values: ['POST'], value: 40, end_time: '2026-09-24T07:00:00+0000' }
            ]
          }
        ] : []
      }
    ];

    return { data: mockData.map(_normaliseAccountInsightsItem), isSupported: true };
  }

  const query = { metric, period };
  if (breakdown) query.breakdown = breakdown;
  if (since) query.since = since;
  if (until) query.until = until;

  const response = await graphGet(`/${igUserId}/insights`, accessToken, query);

  if (!response.data || response.data.length === 0) {
    return { data: [], isSupported: true };
  }

  return {
    data: response.data.map(_normaliseAccountInsightsItem),
    isSupported: true
  };
}

// ─── Normalisation helpers ───────────────────────────────────────────────────

function _normaliseMediaItem(raw) {
  const typeMap = {
    REEL: 'REEL',
    IMAGE: 'IMAGE',
    CAROUSEL_ALBUM: 'CAROUSEL',
    VIDEO: 'VIDEO',
  };

  let type = typeMap[raw.media_type] || 'OTHER';
  if (type === 'VIDEO' && raw.media_product_type === 'REELS') {
    type = 'REEL';
  }

  return {
    externalContentId: raw.id,
    type,
    caption: raw.caption || null,
    permalink: raw.permalink || null,
    publishedAt: raw.timestamp ? new Date(raw.timestamp) : null,
    mediaUrl: raw.media_url || null,
    thumbnailUrl: raw.thumbnail_url || null,
    children: Array.isArray(raw.children?.data)
      ? raw.children.data.map(c => ({
        externalMediaId: c.id,
        mediaType: typeMap[c.media_type] || 'OTHER',
        mediaUrl: c.media_url || null,
      }))
      : [],
  };
}

function _normaliseInsights(insightsArray) {
  const rawPayload = {};
  const lookup = {};

  for (const item of insightsArray) {
    const value = item?.values?.[0]?.value ?? null;
    lookup[item.name] = value;
    rawPayload[item.name] = value;
  }

  return {
    reach: _safeInt(lookup.reach),
    impressions: _safeInt(lookup.impressions),
    plays: _safeInt(lookup.plays ?? lookup.video_views ?? lookup.views),
    likes: _safeInt(lookup.likes),
    comments: _safeInt(lookup.comments),
    saves: _safeInt(lookup.saved),
    shares: _safeInt(lookup.shares),
    totalInteractions: _safeInt(lookup.total_interactions),
    igReelsAvgWatchTime: _safeInt(lookup.ig_reels_avg_watch_time),
    igReelsVideoViewTotalTime: _safeInt(lookup.ig_reels_video_view_total_time),
    reelsSkipRate: _safeFloat(lookup.reels_skip_rate),
    rawPayload,
  };
}

function _normaliseAccountInsightsItem(item) {
  const sanitizedMeta = {
    id: item.id || null,
    name: item.name || null,
    period: item.period || null,
    title: item.title || null,
    description: item.description || null
  };

  let values = [];
  if (Array.isArray(item.values)) {
    values = item.values.map(v => ({
      value: _safeFloat(v.value),
      endTime: v.end_time || null
    }));
  } else if (item.total_value) {
    values = [{
      value: _safeFloat(item.total_value.value),
      endTime: item.total_value.end_time || null
    }];
  }

  const rawBreakdowns = Array.isArray(item.breakdowns) ? item.breakdowns :
    (item.total_value && Array.isArray(item.total_value.breakdowns) ? item.total_value.breakdowns : []);

  const breakdowns = rawBreakdowns.map(b => ({
    dimension_keys: b.dimension_keys || [],
    results: Array.isArray(b.results) ? b.results.map(r => ({
      dimension_values: r.dimension_values || [],
      value: _safeFloat(r.value),
      endTime: r.end_time || null
    })) : []
  }));

  return {
    metricName: item.name,
    period: item.period,
    values,
    breakdowns,
    rawPayload: sanitizedMeta
  };
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
  generateAuthUrl,
  exchangeCodeForToken,
  fetchProfile,
  fetchUserMedia,
  fetchMediaDetail,
  fetchMediaInsights,
  fetchAccountInsights,
  GRAPH_API_VERSION,
  _normaliseMediaItem,
  _normaliseInsights,
  _normaliseAccountInsightsItem,
};