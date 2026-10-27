// src/services/strategyApi.js

const BASE_URL = '/api/v2';

// Helper for native fetch to match your existing app's auth pattern
async function fetchAPI(endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include',
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || error.error?.message || 'API request failed');
    }

    return res.json();
}

export const strategyApi = {
    // 1. Trigger Strategy Generation (Macro)
    generateStrategy(brandId) {
        return fetchAPI(`/brands/${brandId}/strategy/generate`, { method: 'POST' });
    },

    // 2. Fetch Active Strategy (Macro View)
    getActiveStrategy(brandId) {
        return fetchAPI(`/brands/${brandId}/strategy`, { method: 'GET' });
    },

    // 3. Fetch Ideas for a Strategy (Ideation Board)
    getIdeas(strategyId) {
        return fetchAPI(`/strategy/${strategyId}/ideas`, { method: 'GET' });
    },

    // 4. Discard & Replace Idea (Generates 1 targeted replacement)
    generateIdeas(brandId, strategyId, count = 1) {
        return fetchAPI(`/brands/${brandId}/ideas/generate`, {
            method: 'POST',
            body: JSON.stringify({ strategyId, count })
        });
    },

    // 5. Trigger Script Generation / Regeneration (with optional feedback)
    generateScript(ideaId, instruction = null) {
        return fetchAPI(`/ideas/${ideaId}/scripts/generate`, {
            method: 'POST',
            body: JSON.stringify({ instruction })
        });
    },

    // 6. Fetch Scripts for a specific Idea
    getScripts(ideaId) {
        return fetchAPI(`/ideas/${ideaId}/scripts`, { method: 'GET' });
    }
};