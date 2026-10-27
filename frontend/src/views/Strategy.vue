<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-8 pb-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold mb-2 text-white">Brand Strategy</h2>
        <p class="text-gray-400">Your algorithmic blueprint and creative guardrails.</p>
      </div>
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        :disabled="generating || loading || !authStore.activeBrand"
        @click="generateStrategy"
      >
        {{ generating ? 'Generating Strategy...' : 'Generate New Strategy' }}
      </button>
    </div>

    <!-- Job Polling Message -->
    <p v-if="jobMessage" class="text-sm text-blue-200 bg-blue-900/30 border border-blue-800 rounded-lg p-4 animate-pulse">
      {{ jobMessage }}
    </p>

    <!-- States -->
    <div v-if="loading" class="text-gray-400 animate-pulse bg-gray-900 p-8 rounded-xl border border-gray-800">
      Loading active strategy...
    </div>

    <div v-else-if="error" class="p-6 bg-red-900/50 border border-red-800 rounded-xl text-red-200">
      <h3 class="text-lg font-medium mb-2">Failed to load strategy</h3>
      <p>{{ error }}</p>
      <button type="button" @click="loadStrategy" class="mt-4 px-3 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-sm font-medium">
        Retry
      </button>
    </div>

    <div v-else-if="!strategy" class="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
      <div class="w-16 h-16 bg-gray-800 rounded-full mx-auto flex items-center justify-center mb-4 text-2xl">🧭</div>
      <h3 class="text-xl font-bold mb-2">No Active Strategy</h3>
      <p class="max-w-xl mx-auto text-gray-400 mb-6">You haven't generated a strategy blueprint for this brand yet.</p>
      <button @click="generateStrategy" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
        Generate Strategy
      </button>
    </div>

    <!-- Active Strategy Display -->
    <div v-else class="space-y-6">
      
      <div class="flex items-center justify-between">
        <span class="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400 uppercase tracking-wide">Version {{ strategy.version }}</span>
        <router-link :to="`/strategy/${strategy.id}/ideas`" class="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-2 bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-900/50 transition-colors">
          View Content Ideas <span>→</span>
        </router-link>
      </div>

      <!-- Core Positioning -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8 space-y-6">
        <div>
          <h3 class="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Core Objective</h3>
          <p class="text-xl text-white font-medium">{{ strategy.objective }}</p>
        </div>
        <div class="grid md:grid-cols-2 gap-8 pt-6 border-t border-gray-800">
          <div>
            <h3 class="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Target Audience</h3>
            <p class="text-gray-300 leading-relaxed">{{ strategy.targetAudience }}</p>
          </div>
          <div>
            <h3 class="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Market Positioning</h3>
            <p class="text-gray-300 leading-relaxed">{{ strategy.positioning }}</p>
          </div>
        </div>
      </div>

      <!-- Pillars & Formats -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 class="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4">Content Pillars</h3>
          <ul class="space-y-4">
            <li v-for="(pillar, idx) in strategy.pillars" :key="idx" class="flex items-start gap-3 text-gray-300">
              <span class="text-blue-500 mt-1">•</span>
              <div v-if="parseJsonItem(pillar).name">
                <strong class="text-white block mb-1">{{ parseJsonItem(pillar).name }}</strong>
                <span class="text-sm text-gray-400 leading-relaxed">{{ parseJsonItem(pillar).description || parseJsonItem(pillar).rationale }}</span>
              </div>
              <span v-else>{{ pillar }}</span>
            </li>
          </ul>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 class="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4">Recommended Formats</h3>
          <div class="flex flex-col gap-3">
            <div v-for="(format, idx) in strategy.recommendedFormats" :key="idx" class="p-4 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300">
              <template v-if="parseJsonItem(format).format">
                <strong class="text-white block mb-1 text-base">{{ parseJsonItem(format).format }}</strong>
                <span class="text-gray-400">{{ parseJsonItem(format).description }}</span>
              </template>
              <template v-else>{{ format }}</template>
            </div>
          </div>
        </div>
      </div>

      <!-- Guardrails (Do / Stop) -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 border-t-4 border-t-emerald-500">
          <h3 class="text-sm uppercase tracking-widest text-emerald-500 font-bold mb-4">The "Do" List</h3>
          <ul class="space-y-3">
            <li v-for="(item, idx) in strategy.doList" :key="idx" class="flex items-start gap-3 text-gray-300 text-sm">
              <span class="text-emerald-500 font-bold">✓</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 border-t-4 border-t-red-500">
          <h3 class="text-sm uppercase tracking-widest text-red-500 font-bold mb-4">The "Stop" List</h3>
          <ul class="space-y-3">
            <li v-for="(item, idx) in strategy.stopList" :key="idx" class="flex items-start gap-3 text-gray-300 text-sm">
              <span class="text-red-500 font-bold">✗</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { strategyApi } from '../services/strategyApi';

const authStore = useAuthStore();
const strategy = ref(null);
const loading = ref(true);
const generating = ref(false);
const error = ref(null);
const jobMessage = ref('');
let pollInterval = null;

// Helper to cleanly parse the stringified JSON objects from the DB
const parseJsonItem = (item) => {
  if (!item) return {};
  try {
    return typeof item === 'string' && item.startsWith('{') ? JSON.parse(item) : { name: item };
  } catch {
    return { name: item };
  }
};

const loadStrategy = async () => {
  if (!authStore.activeBrand) return;
  loading.value = true;
  error.value = null;

  try {
    const response = await strategyApi.getActiveStrategy(authStore.activeBrand.id);
    strategy.value = response.data.strategy;
  } catch (err) {
    if (err.message.includes('No strategy found')) {
      strategy.value = null;
    } else {
      error.value = err.message || 'Failed to load strategy.';
    }
  } finally {
    loading.value = false;
  }
};

const generateStrategy = async () => {
  if (!authStore.activeBrand) return;
  generating.value = true;
  error.value = null;
  jobMessage.value = 'Initializing AI Strategy Engine...';

  try {
    const res = await strategyApi.generateStrategy(authStore.activeBrand.id);
    const jobId = res.data.job.id;
    pollJob(jobId);
  } catch (err) {
    error.value = err.message || 'Failed to trigger strategy generation.';
    generating.value = false;
    jobMessage.value = '';
  }
};

const pollJob = (jobId) => {
  if (pollInterval) clearInterval(pollInterval);
  
  pollInterval = setInterval(async () => {
    try {
      const res = await strategyApi.getJobStatus(authStore.activeBrand.id, jobId);
      const job = res.data.job;

      jobMessage.value = `Processing: ${job.progressStep || 'Thinking...'} (${job.progressPercent}%)`;

      if (job.state === 'COMPLETED') {
        clearInterval(pollInterval);
        jobMessage.value = '';
        generating.value = false;
        await loadStrategy(); // Reloads fresh data safely
      } else if (job.state === 'FAILED') {
        clearInterval(pollInterval);
        error.value = 'Strategy generation failed. Please try again.';
        generating.value = false;
        jobMessage.value = '';
      }
    } catch (err) {
      console.error('Polling error', err);
    }
  }, 2000);
};

onMounted(() => {
  loadStrategy();
});

watch(() => authStore.activeBrand, () => {
  loadStrategy();
});
</script>