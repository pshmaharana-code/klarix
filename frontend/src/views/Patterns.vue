<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-8 pb-12">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold mb-2 text-white">Patterns</h2>
        <p class="text-gray-400">Evidence-backed signals found across your analysed content.</p>
      </div>
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        :disabled="discovering || loading || !authStore.activeBrand"
        @click="discoverPatterns"
      >
        {{ discovering ? 'Discovering...' : 'Discover Patterns' }}
      </button>
    </div>

    <div v-if="loading" class="text-gray-400 animate-pulse bg-gray-900 p-8 rounded-xl border border-gray-800">
      Loading patterns...
    </div>

    <div v-else-if="error" class="p-6 bg-red-900/50 border border-red-800 rounded-xl text-red-200">
      <h3 class="text-lg font-medium mb-2">Failed to load patterns</h3>
      <p>{{ error }}</p>
      <button type="button" @click="loadPatterns" class="mt-4 px-3 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-sm font-medium">
        Retry
      </button>
    </div>

    <div v-else-if="insufficientData" class="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
      <h3 class="text-xl font-bold mb-2">More evidence is needed</h3>
      <p class="max-w-xl mx-auto text-gray-400">{{ insufficientData }}</p>
    </div>

    <div v-else-if="!patterns.length" class="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
      <h3 class="text-xl font-bold mb-2">No evidence-backed patterns yet</h3>
      <p class="max-w-xl mx-auto text-gray-400">Analyse more content, then run discovery to look for repeatable signals. Klarix will not publish a pattern without supporting evidence.</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <router-link
        v-for="pattern in patterns"
        :key="pattern.id"
        :to="`/patterns/${pattern.id}`"
        class="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-indigo-500/60 transition-colors"
      >
        <div class="flex items-start justify-between gap-4 mb-4">
          <span class="text-xs uppercase tracking-wide text-indigo-300">{{ pattern.category }}</span>
          <span class="text-xs text-gray-400">{{ pattern.evidenceCount }} evidence items</span>
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">{{ pattern.title }}</h3>
        <p class="text-gray-300 leading-relaxed">{{ pattern.claim }}</p>
        <div class="mt-5 flex items-center justify-between text-sm">
          <span class="text-gray-400">Confidence</span>
          <span class="font-medium text-emerald-300">{{ formatConfidence(pattern.confidence) }}</span>
        </div>
      </router-link>
    </div>

    <p v-if="queuedMessage" class="text-sm text-indigo-200 bg-indigo-950/50 border border-indigo-800 rounded-lg p-4" role="status">
      {{ queuedMessage }}
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const patterns = ref([]);
const loading = ref(false);
const discovering = ref(false);
const error = ref(null);
const insufficientData = ref(null);
const queuedMessage = ref(null);

const ensureActiveBrand = async () => {
  if (authStore.activeBrand) return true;

  const response = await fetch('/api/v2/brands', { credentials: 'include' });
  if (!response.ok) throw new Error('Could not load your brands');
  const payload = await response.json();
  const brand = payload.data?.brands?.[0];
  if (brand) authStore.setActiveBrand(brand);
  return Boolean(brand);
};

const loadPatterns = async () => {
  loading.value = true;
  error.value = null;
  insufficientData.value = null;

  try {
    if (!await ensureActiveBrand()) {
      patterns.value = [];
      return;
    }

    const response = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/patterns`, { credentials: 'include' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'Could not load patterns');
    patterns.value = payload?.data?.items || [];
  } catch (cause) {
    error.value = cause.message || 'Could not load patterns';
  } finally {
    loading.value = false;
  }
};

const discoverPatterns = async () => {
  discovering.value = true;
  queuedMessage.value = null;
  insufficientData.value = null;

  try {
    if (!await ensureActiveBrand()) return;

    const response = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/patterns/discover`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `patterns-ui-${Date.now()}`
      },
      body: JSON.stringify({ force: false })
    });
    const payload = await response.json().catch(() => null);

    if (response.status === 422 && payload?.error === 'INSUFFICIENT_DATA') {
      insufficientData.value = `${payload.data.sampleSize} of ${payload.data.minimumSampleSize} required analysed content items are available.`;
      patterns.value = [];
      return;
    }
    if (!response.ok) throw new Error(payload?.message || 'Could not start pattern discovery');

    queuedMessage.value = 'Pattern discovery is queued. Refresh shortly to see only patterns that meet the evidence gate.';
    window.setTimeout(loadPatterns, 1500);
  } catch (cause) {
    error.value = cause.message || 'Could not start pattern discovery';
  } finally {
    discovering.value = false;
  }
};

const formatConfidence = value => value == null ? 'Unavailable' : `${Number(value).toFixed(0)}%`;

onMounted(loadPatterns);
</script>
