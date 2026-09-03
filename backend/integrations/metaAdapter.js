/**
 * Mock Meta Adapter for Klarix V2 Phase 2.
 * This explicitly returns deterministic mock data to verify the connection lifecycle.
 * No real Facebook Graph APIs are called here.
 */

function generateAuthUrl(state) {
  // The opaque state is generated and persisted by the application, never trusted from the browser.
  const redirectUri = encodeURIComponent(`http://localhost:5173/onboarding/connect`);
  return `https://mock.instagram.com/oauth/authorize?client_id=mock_client&redirect_uri=${redirectUri}&scope=instagram_basic,instagram_manage_insights,pages_show_list&response_type=code&state=${encodeURIComponent(state)}`;
}

async function exchangeCodeForToken(code) {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!code || code === 'invalid_code') {
    throw new Error('Invalid OAuth code');
  }

  // Return a mocked long-lived token
  return {
    accessToken: `mock_access_token_${Date.now()}`,
    expiresIn: 60 * 60 * 24 * 60, // 60 days
  };
}

async function fetchProfile(accessToken) {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!accessToken.startsWith('mock_access_token')) {
    throw new Error('Invalid access token format');
  }

  // Return deterministic mock data
  return {
    platform: 'INSTAGRAM',
    externalAccountId: accessToken.replace('mock_access_token_', 'mock_ext_acct_'),
    username: 'mocked_brand_official',
    accountType: 'BUSINESS',
    profilePictureUrl: 'https://via.placeholder.com/150',
    followersCount: 12500, // Minimal context, not fabricated analytics
  };
}

export {
  generateAuthUrl,
  exchangeCodeForToken,
  fetchProfile
};
