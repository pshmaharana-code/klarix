/**
 * Mock Meta Adapter for Klarix V2 Phase 2.
 * This explicitly returns deterministic mock data to verify the connection lifecycle.
 * No real Facebook Graph APIs are called here.
 */

function generateAuthUrl(brandId) {
  // In a real implementation, this would build the OAuth URL with state, clientId, redirectUri, scopes.
  const redirectUri = encodeURIComponent(`http://localhost:5173/onboarding/connect`);
  const state = encodeURIComponent(JSON.stringify({ brandId }));
  return `https://mock.instagram.com/oauth/authorize?client_id=mock_client&redirect_uri=${redirectUri}&scope=instagram_basic,instagram_manage_insights,pages_show_list&response_type=code&state=${state}`;
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
    externalAccountId: 'mock_ext_acct_12345',
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
