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

/**
 * Graph API version to use for all requests.
 *
 * Callers should verify this against the current Meta Graph API changelog:
 * https://developers.facebook.com/docs/graph-api/changelog
 *
 * Set META_GRAPH_API_VERSION in your environment to override without code change.
 *
 * WARNING: Meta deprecates API versions approximately every 2 years.
 * This must be kept current when upgrading.
 */
const GRAPH_API_VERSION =
  process.env.META_GRAPH_API_VERSION || 'v21.0';

/** Base URL for all Graph API requests. */
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ─── Fixture data (NODE_ENV === 'test' only) ─────────────────────────────────

/**
 * Deterministic fixture media items returned for testing.
 *
 * Contains multiple media types (REEL, IMAGE, CAROUSEL) and at least two
 * items to exercise pagination logic.
 */
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

/** Deterministic fixture insights keyed by media ID. */
const FIXTURE_INSIGHTS = {
  fixture_media_001: { reach: 8500, impressions: 12000, plays: 6200, likes: 430, comments: 28, saves: 155, shares: 67 },
  fixture_media_002: { reach: 4200, impressions: 5100, plays: null,  likes: 310, comments: 14, saves: 88,  shares: 22 },
  fixture_media_003: { reach: 3100, impressions: 3900, plays: null,  likes: 210, comments: 9,  saves: 45,  shares: 11 },
  fixture_media_004: { reach: 6700, impressions: 9200, plays: 5100, likes: 520, comments: 41, saves: 199, shares: 83 },
  fixture_media_005: { reach: 2900, impressions: 3400, plays: null,  likes: 180, comments: 7,  saves: 32,  shares: 9  },
};

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Assert that fixture mode must only be used in test.
 * Throws if called outside NODE_ENV=test.
 */
function assertFixtureModeAllowed() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      '[metaAdapter] Fixture mode is only permitted when NODE_ENV=test. ' +
      'In other environments, provide real META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI.'
    );
  }
}

/**
 * Build the Authorization header value without logging the token.
 * Returns the header object only — never a plain string in logs.
 */
function bearerHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Make a GET request to the Graph API.
 *
 * @param {string} path      e.g. '/me' or '/17841234/media'
 * @param {string} accessToken  Used in Authorization header only
 * @param {object} [query]   Additional URL search params
 * @returns {Promise<object>}
 */
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
    // Never include access token in error
    const err = new Error(
      json.error?.message || `Graph API request failed: ${response.status}`
    );
    err.code = json.error?.type || 'GRAPH_API_ERROR';
    err.graphErrorCode = json.error?.code;
    throw err;
  }

  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 exports (preserved exactly — Phase 2 tests must continue to pass)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate the Instagram OAuth authorization URL.
 * The opaque `state` parameter is generated server-side; it is not trusted
 * from the browser.
 *
 * Phase 2 behaviour preserved.
 *
 * @param {string} state  Server-generated single-use state token
 * @returns {string}
 */
function generateAuthUrl(state) {
  const redirectUri = encodeURIComponent(`http://localhost:5173/onboarding/connect`);
  return (
    `https://mock.instagram.com/oauth/authorize` +
    `?client_id=mock_client` +
    `&redirect_uri=${redirectUri}` +
    `&scope=instagram_basic,instagram_manage_insights,pages_show_list` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}`
  );
}

/**
 * Exchange an OAuth authorization code for a long-lived access token.
 *
 * Phase 2 behaviour preserved (fixture for test; real exchange otherwise).
 *
 * @param {string} code
 * @returns {Promise<{ accessToken: string, expiresIn: number }>}
 */
async function exchangeCodeForToken(code) {
  if (process.env.NODE_ENV === 'test') {
    // Fixture: simulate latency and validate the code argument
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!code || code === 'invalid_code') {
      throw new Error('Invalid OAuth code');
    }
    return {
      accessToken: `mock_access_token_${Date.now()}`,
      expiresIn: 60 * 60 * 24 * 60, // 60 days
    };
  }

  // Production: real short-lived → long-lived token exchange.
  // Requires META_APP_ID, META_APP_SECRET, META_REDIRECT_URI.
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    const err = new Error(
      'META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI must be set for token exchange'
    );
    err.code = 'META_CONFIG_MISSING';
    throw err;
  }

  // Step 1: exchange code for short-lived token
  const shortLivedUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  shortLivedUrl.searchParams.set('client_id', appId);
  shortLivedUrl.searchParams.set('client_secret', appSecret);
  shortLivedUrl.searchParams.set('redirect_uri', redirectUri);
  shortLivedUrl.searchParams.set('code', code);

  const shortRes = await fetch(shortLivedUrl.toString());
  const shortJson = await shortRes.json();
  if (!shortRes.ok || shortJson.error) {
    const err = new Error(shortJson.error?.message || 'Token exchange failed');
    err.code = 'OAUTH_EXCHANGE_FAILED';
    throw err;
  }

  // Step 2: exchange short-lived token for long-lived token
  const longLivedUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longLivedUrl.searchParams.set('client_id', appId);
  longLivedUrl.searchParams.set('client_secret', appSecret);
  longLivedUrl.searchParams.set('fb_exchange_token', shortJson.access_token);

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

/**
 * Fetch the Instagram professional account profile associated with a token.
 *
 * Phase 2 behaviour preserved (fixture for test; real call otherwise).
 *
 * @param {string} accessToken  Never logged
 * @returns {Promise<{
 *   platform: string,
 *   externalAccountId: string,
 *   username: string,
 *   accountType: string,
 *   profilePictureUrl: string,
 *   followersCount: number
 * }>}
 */
async function fetchProfile(accessToken) {
  if (process.env.NODE_ENV === 'test') {
    // Phase 2 fixture behaviour preserved exactly
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!accessToken.startsWith('mock_access_token')) {
      throw new Error('Invalid access token format');
    }
    return {
      platform: 'INSTAGRAM',
      externalAccountId: accessToken.replace('mock_access_token_', 'mock_ext_acct_'),
      username: 'mocked_brand_official',
      accountType: 'BUSINESS',
      profilePictureUrl: 'https://via.placeholder.com/150',
      followersCount: 12500,
    };
  }

  // Production: fetch IG user ID and details via Graph API
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

/**
 * Fetch the account's recent media items.
 *
 * Returns a normalised array of media items sufficient for the IMPORT_CONTENT
 * worker to create Content and ContentMedia rows.  Pagination via `after` cursor
 * is supported.
 *
 * SECURITY: accessToken is used in Authorization header only — never returned,
 * never logged.
 *
 * @param {string}  accessToken     Never logged
 * @param {string}  igUserId        Instagram user/account ID
 * @param {object}  [opts]
 * @param {number}  [opts.limit=25] Number of items to request (max 100)
 * @param {string}  [opts.after]    Pagination cursor from previous response
 * @returns {Promise<{
 *   items: Array<{
 *     externalContentId: string,
 *     type: string,
 *     caption: string|null,
 *     permalink: string|null,
 *     publishedAt: Date|null,
 *     mediaUrl: string|null,
 *     thumbnailUrl: string|null,
 *     children: Array<{ externalMediaId: string, mediaType: string, mediaUrl: string }>
 *   }>,
 *   nextCursor: string|null
 * }>}
 */
async function fetchUserMedia(accessToken, igUserId, { limit = 25, after = null } = {}) {
  if (process.env.NODE_ENV === 'test') {
    assertFixtureModeAllowed(); // ensures NODE_ENV is really 'test'

    // Simulate simple pagination: first page = items 0..2, second page = items 3..4
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

  // Production
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

  const query = { fields, limit: Math.min(limit, 100) };
  if (after) query.after = after;

  const data = await graphGet(`/${igUserId}/media`, accessToken, query);

  const items = (data.data || []).map(_normaliseMediaItem);
  const nextCursor = data.paging?.cursors?.after ?? null;

  return { items, nextCursor };
}

/**
 * Retrieve additional detail for an individual media object.
 *
 * Used when `fetchUserMedia` does not return a complete set of fields
 * (e.g. to retrieve thumbnail_url for a REEL that was returned in a
 * carousel children response).
 *
 * @param {string} accessToken  Never logged
 * @param {string} mediaId      Platform media ID
 * @returns {Promise<{
 *   externalContentId: string,
 *   type: string,
 *   caption: string|null,
 *   permalink: string|null,
 *   publishedAt: Date|null,
 *   mediaUrl: string|null,
 *   thumbnailUrl: string|null,
 *   children: Array
 * }>}
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
 * Retrieve available metrics (insights) for an individual content item.
 *
 * Provider metric names are mapped here to internal field names.
 * Unsupported or unavailable metrics are represented as `null` rather than
 * crashing the entire operation.
 *
 * A completely unusable response (e.g. non-object, error object) produces a
 * deterministic GRAPH_API_ERROR rather than silently returning empty metrics.
 *
 * SECURITY: accessToken is used only in the Authorization header and is never
 * returned or logged.
 *
 * @param {string} accessToken  Never logged
 * @param {string} mediaId      Platform media ID
 * @returns {Promise<{
 *   reach: number|null,
 *   impressions: number|null,
 *   plays: number|null,
 *   likes: number|null,
 *   comments: number|null,
 *   saves: number|null,
 *   shares: number|null,
 *   rawPayload: object
 * }>}
 */
async function fetchMediaInsights(accessToken, mediaId) {
  if (process.env.NODE_ENV === 'test') {
    assertFixtureModeAllowed();

    const raw = FIXTURE_INSIGHTS[mediaId];
    if (!raw) {
      // Unknown fixture media — return all nulls rather than crashing
      return {
        reach: null, impressions: null, plays: null,
        likes: null, comments: null, saves: null, shares: null,
        rawPayload: {},
      };
    }
    return { ...raw, rawPayload: { _fixture: true, mediaId } };
  }

  // Production: fetch available metrics
  // Meta returns different metric names depending on media type and API version.
  // We request all we want and gracefully handle missing ones.
  const REQUESTED_METRICS = 'reach,impressions,plays,likes,comments,saved,shares';

  const data = await graphGet(`/${mediaId}/insights`, accessToken, {
    metric: REQUESTED_METRICS,
  });

  if (!data || !Array.isArray(data.data)) {
    const err = new Error('Unexpected insights response structure');
    err.code = 'GRAPH_API_ERROR';
    throw err;
  }

  return _normaliseInsights(data.data);
}

// ─── Normalisation helpers ───────────────────────────────────────────────────

/**
 * Map a raw Graph API media object to our internal shape.
 * SECURITY: this function must not include access tokens in the output.
 */
function _normaliseMediaItem(raw) {
  const typeMap = {
    REEL: 'REEL',
    IMAGE: 'IMAGE',
    CAROUSEL_ALBUM: 'CAROUSEL',
    VIDEO: 'VIDEO',
  };

  return {
    externalContentId: raw.id,
    type: typeMap[raw.media_type] || 'OTHER',
    caption: raw.caption || null,
    permalink: raw.permalink || null,
    publishedAt: raw.timestamp ? new Date(raw.timestamp) : null,
    mediaUrl: raw.media_url || null,
    thumbnailUrl: raw.thumbnail_url || null,
    // Children for CAROUSEL_ALBUM
    children: Array.isArray(raw.children?.data)
      ? raw.children.data.map(c => ({
          externalMediaId: c.id,
          mediaType: typeMap[c.media_type] || 'OTHER',
          mediaUrl: c.media_url || null,
        }))
      : [],
  };
}

/**
 * Map the Graph API insights data array to our internal metric fields.
 * Missing or unavailable metrics become null.
 * Invent nothing — only use what the provider returned.
 *
 * Meta metric name → internal field mappings:
 *   reach         → reach
 *   impressions   → impressions
 *   plays         → plays   (REEL only; older versions use video_views)
 *   video_views   → plays   (fallback alias)
 *   likes         → likes
 *   comments      → comments
 *   saved         → saves   (Note: Meta uses 'saved' not 'saves')
 *   shares        → shares
 */
function _normaliseInsights(insightsArray) {
  const rawPayload = {};
  const lookup = {};

  for (const item of insightsArray) {
    // Each item has { name, period, values: [{ value }] }
    const value = item?.values?.[0]?.value ?? null;
    lookup[item.name] = value;
    rawPayload[item.name] = value;
  }

  return {
    reach:       _safeInt(lookup.reach),
    impressions: _safeInt(lookup.impressions),
    plays:       _safeInt(lookup.plays ?? lookup.video_views),
    likes:       _safeInt(lookup.likes),
    comments:    _safeInt(lookup.comments),
    saves:       _safeInt(lookup.saved),    // Meta uses 'saved'
    shares:      _safeInt(lookup.shares),
    rawPayload,
  };
}

/**
 * Safely coerce a value to integer or null.
 * Returns null for undefined, null, or non-numeric values rather than NaN.
 */
function _safeInt(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  // Phase 2 — preserved
  generateAuthUrl,
  exchangeCodeForToken,
  fetchProfile,
  // Phase 3 — new
  fetchUserMedia,
  fetchMediaDetail,
  fetchMediaInsights,
  // Exposed for testing internals
  GRAPH_API_VERSION,
};
