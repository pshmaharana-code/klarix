<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-8 pb-12">
    
    <!-- Loading State -->
    <div v-if="loading" class="text-gray-400 animate-pulse bg-gray-900 p-8 rounded-xl border border-gray-800">
      Initializing command center...
    </div>
    
    <!-- No Brand Selected / Onboarding -->
    <div v-else-if="!authStore.activeBrand" class="text-center py-20 bg-gray-900 rounded-xl border border-gray-800 shadow-sm">
      <div class="w-16 h-16 bg-gray-950 border border-gray-800 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner">
        <span class="text-2xl">⚡</span>
      </div>
      <h2 class="text-2xl font-bold mb-2 text-white uppercase tracking-wide">Initialize Workspace</h2>
      <p class="text-gray-400 mb-8 max-w-md mx-auto">Create your brand entity to begin ingesting telemetry and generating high-converting strategies.</p>
      
      <form @submit.prevent="createBrand" class="max-w-md mx-auto text-left bg-gray-950 p-8 rounded-xl border border-gray-800 shadow-sm">
        <div class="mb-5">
          <label class="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Brand Entity Name</label>
          <input v-model="newBrand.name" type="text" placeholder="e.g. Klarix Intelligence" class="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none transition-colors" required />
        </div>
        <div class="mb-8">
          <label class="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Market Positioning</label>
          <input v-model="newBrand.positioning" type="text" placeholder="e.g. AI-powered content engine for founders" class="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none transition-colors" />
        </div>
        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-sm uppercase tracking-wider text-sm" :disabled="creating">
          {{ creating ? 'Provisioning...' : 'Create Brand Entity →' }}
        </button>
      </form>
    </div>

    <!-- Active Command Center -->
    <div v-else class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h2 class="text-3xl font-bold text-white mb-2">Command Center</h2>
          <p class="text-sm text-gray-400">Phase 1 infrastructure is active for <strong class="text-gray-200">{{ authStore.activeBrand.name }}</strong>.</p>
        </div>
        <div v-if="authStore.activeBrand.onboardingStatus === 'PENDING'" class="shrink-0">
          <router-link to="/onboarding/connect" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm inline-flex items-center gap-2">
            Connect Data Source →
          </router-link>
        </div>
      </div>

      <!-- SECTION 1: Macro Telemetry (Executive Brief) -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
        <div v-if="loadingData" class="animate-pulse flex-1">
          <div class="h-3 bg-gray-800 rounded w-32 mb-4"></div>
          <div class="h-8 bg-gray-800 rounded w-64 mb-3"></div>
          <div class="h-4 bg-gray-800 rounded w-96"></div>
        </div>
        <div v-else-if="analyticsOverview?.comparisons?.growth">
          <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2 block">Macro Velocity Verdict</span>
          <h3 class="text-2xl sm:text-3xl font-bold text-white mb-2 uppercase tracking-wide" :class="getVerdictColor(analyticsOverview.comparisons.growth)">
            {{ analyticsOverview.comparisons.growth }}
          </h3>
          <p class="text-sm text-gray-400 max-w-md">
            Your content interaction rate is trending <strong class="text-gray-200">{{ formatTrend(analyticsOverview.comparisons.interactionRateTrend) }}</strong> relative to historical baseline.
          </p>
        </div>
        <div v-else>
          <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Macro Velocity Verdict</span>
          <h3 class="text-2xl sm:text-3xl font-bold text-gray-300 mb-2 uppercase tracking-wide">
            Awaiting Telemetry
          </h3>
          <p class="text-sm text-gray-400 max-w-md">
            Insufficient data to calculate macro velocity. Sync your social accounts and publish more content.
          </p>
        </div>
        <div class="shrink-0">
          <router-link to="/analytics" class="px-6 py-3 rounded-lg bg-gray-950 border border-gray-800 hover:border-gray-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm block text-center">
            View Analytics →
          </router-link>
        </div>
      </div>

      <!-- SECTION 2: Command Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Brand Memory Module -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between group hover:border-gray-700 transition-colors">
          <div>
            <div class="flex items-center justify-between mb-5">
              <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Strategic Pulse</span>
              <span class="text-3xl font-bold text-white">{{ loadingData ? '-' : activeMemoryCount }}</span>
            </div>
            <h3 class="text-xl font-bold text-white mb-4">Brand Memory</h3>
            
            <div v-if="latestMemory" class="mb-8 border-l-2 border-emerald-500 pl-4">
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Active Constitution Rule</span>
              <p class="text-sm text-gray-300 italic leading-relaxed line-clamp-3">
                "{{ latestMemory.statement }}"
              </p>
            </div>
            <div v-else class="mb-8">
              <p class="text-sm text-gray-400">No active rules dictating your AI generation engine. Approve patterns to build your core strategy.</p>
            </div>
          </div>
          <router-link to="/memory" class="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors uppercase tracking-wider flex items-center gap-2">
            Review Constitution <span>→</span>
          </router-link>
        </div>

        <!-- Action Pipeline Module -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between group hover:border-gray-700 transition-colors">
          <div>
            <div class="flex items-center justify-between mb-5">
              <span class="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Action Pipeline</span>
              <span class="text-3xl font-bold text-white">{{ loadingData ? '-' : pendingIdeasCount }}</span>
            </div>
            <h3 class="text-xl font-bold text-white mb-4">Pending Scripts</h3>
            
            <div v-if="nextPendingIdea" class="mb-8">
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Next Up in Ideation Board</span>
              <div class="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-blue-400">{{ nextPendingIdea.format }}</span>
                </div>
                <p class="text-sm text-gray-200 font-medium truncate">{{ nextPendingIdea.title }}</p>
              </div>
            </div>
            <div v-else class="mb-8">
              <p class="text-sm text-gray-400">Inbox Zero. All scripts have been published or you need to generate a new strategy.</p>
            </div>
          </div>
          <router-link :to="latestStrategyId ? `/strategy/${latestStrategyId}/ideas` : '/strategy'" class="text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors uppercase tracking-wider flex items-center gap-2">
            Access Ideation Board <span>→</span>
          </router-link>
        </div>

      </div>

      <!-- SECTION 3: Telemetry Ingestion (Social Sync) -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div class="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
          <h3 class="text-xs font-bold text-white uppercase tracking-widest">Telemetry Ingestion Sources</h3>
        </div>
        
        <div v-if="authStore.activeBrand.socialAccounts?.length > 0" class="divide-y divide-gray-800">
          <div v-for="account in authStore.activeBrand.socialAccounts" :key="account.id" class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 hover:bg-gray-800/30 transition-colors">
            
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center shrink-0 shadow-inner">
                <span class="text-lg font-black text-white capitalize">{{ account.platform.charAt(0) }}</span>
              </div>
              <div>
                <div class="font-bold text-white uppercase tracking-wider text-sm">{{ account.platform }} <span class="text-gray-500 font-medium normal-case tracking-normal ml-1">@{{ account.username }}</span></div>
                <div class="text-xs text-gray-500 mt-1.5 font-medium uppercase tracking-wider">
                  Last Sync: <span class="text-gray-300">{{ account.lastSync ? new Date(account.lastSync).toLocaleString() : 'Never' }}</span>
                </div>
              </div>
            </div>

            <div class="shrink-0">
              <button 
                v-if="!syncingAccount"
                @click="syncAccount(account)" 
                class="px-5 py-2.5 bg-gray-950 hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-gray-700 shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Sync Telemetry
              </button>
              
              <div v-else-if="syncingAccount === account.id" class="px-5 py-2.5 bg-indigo-900/20 border border-indigo-900/50 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 justify-center shadow-sm">
                <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing ({{ syncProgress }}%)
              </div>
            </div>

          </div>
        </div>

        <div v-else class="p-8 text-center bg-gray-900">
          <p class="text-sm text-gray-500 font-medium">No data sources connected. Connect an Instagram account to begin telemetry ingestion.</p>
        </div>

        <!-- Sync Alerts -->
        <div v-if="syncError" class="p-4 bg-red-900/20 border-t border-red-900/50 text-red-400 text-sm font-medium text-center">
          {{ syncError }}
        </div>
        <div v-if="syncSuccess" class="p-4 bg-emerald-900/20 border-t border-emerald-900/50 text-emerald-400 text-sm font-medium text-center">
          Telemetry synchronized successfully. Patterns and Analytics have been updated.
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { strategyApi } from '../services/strategyApi'; // <-- Import the API client

const authStore = useAuthStore();
const loading = ref(true);
const creating = ref(false);
const newBrand = ref({ name: '', positioning: '' });

const syncingAccount = ref(null);
const syncProgress = ref(0);
const syncError = ref(null);
const syncSuccess = ref(false);
let pollInterval = null;

// Dashboard specific state
const loadingData = ref(false);
const analyticsOverview = ref(null);

const activeMemoryCount = ref(0);
const latestMemory = ref(null);

const pendingIdeasCount = ref(0);
const nextPendingIdea = ref(null);
const latestStrategyId = ref(null);

const fetchBrands = async () => {
  try {
    const res = await fetch('/api/v2/brands', {credentials: 'include'});
    if (res.ok) {
      const { data } = await res.json();
      if (data.brands && data.brands.length > 0) {
        authStore.setActiveBrand(data.brands[0]);
      }
    }
  } catch (e) {
    console.error('Error fetching brands:', e);
  } finally {
    loading.value = false;
  }
};

const fetchDashboardData = async () => {
  if (!authStore.activeBrand) return;
  loadingData.value = true;
  
  try {
    // 1. Fetch Analytics, Memory, and Strategy (Using your robust strategyApi client)
    const [analyticsRes, memoryRes, strategyData] = await Promise.all([
      fetch(`/api/v2/brands/${authStore.activeBrand.id}/analytics/overview`, {credentials: 'include'}).catch(() => null),
      fetch(`/api/v2/brands/${authStore.activeBrand.id}/memory`, {credentials: 'include'}).catch(() => null),
      strategyApi.getActiveStrategy(authStore.activeBrand.id).catch(() => null) // <-- Using API Client
    ]);
    
    // Process Analytics
    if (analyticsRes && analyticsRes.ok) {
      const aData = await analyticsRes.json();
      analyticsOverview.value = aData.data || null;
    }
    
    // Process Memory Rules
    if (memoryRes && memoryRes.ok) {
      const mData = await memoryRes.json();
      const memories = mData.data?.memories || [];
      activeMemoryCount.value = memories.length;
      if (memories.length > 0) {
        latestMemory.value = memories[0]; 
      }
    }

    // Process Action Pipeline (Strategy & Ideas)
    if (strategyData && strategyData.data) {
      // Extract the strategy object securely
      const activeStrategy = strategyData.data.strategy || (strategyData.data.strategies?.length > 0 ? strategyData.data.strategies[0] : null);
      
      if (activeStrategy) {
        latestStrategyId.value = activeStrategy.id;
        
        // 2. Fetch ideas using your strategy API client
        const ideasData = await strategyApi.getIdeas(authStore.activeBrand.id, activeStrategy.id).catch(() => null);

        if (ideasData && ideasData.data) {
          const drafts = (ideasData.data.ideas || []).filter(idea => idea.status === 'DRAFT');
          
          pendingIdeasCount.value = drafts.length;
          if (drafts.length > 0) {
            nextPendingIdea.value = drafts[0];
          } else {
            nextPendingIdea.value = null; // Inbox Zero
          }
        }
      }
    }
  } catch(e) {
    console.error("Dashboard data fetch error", e);
  } finally {
    loadingData.value = false;
  }
};

const createBrand = async () => {
  creating.value = true;
  try {
    const res = await fetch('/api/v2/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBrand.value),
      credentials: 'include'
    });
    if (res.ok) {
      const { data } = await res.json();
      authStore.setActiveBrand(data.brand);
    }
  } catch (e) {
    console.error('Error creating brand:', e);
  } finally {
    creating.value = false;
  }
};

const syncAccount = async (account) => {
  if (syncingAccount.value) return;
  
  syncingAccount.value = account.id;
  syncProgress.value = 0;
  syncError.value = null;
  syncSuccess.value = false;
  
  const idempotencyKey = `sync-${account.id}-${Date.now()}`;
  
  try {
    const res = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/social-accounts/${account.id}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey }),
      credentials: 'include'
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || 'Failed to start sync');
    }
    
    const { data } = await res.json();
    startPolling(data.job.id, account.id);
  } catch (e) {
    console.error('Error starting sync:', e);
    syncError.value = e.message;
    syncingAccount.value = null;
  }
};

const startPolling = (jobId, accountId) => {
  stopPolling();
  
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/jobs/${jobId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Job status request failed');
      
      const { data } = await res.json();
      const job = data.job;
      
      syncProgress.value = job.progressPercent || 0;
      
      if (job.state === 'COMPLETED') {
        stopPolling();
        syncingAccount.value = null;
        syncSuccess.value = true;
        await fetchBrands();
        await fetchDashboardData(); // Refresh all telemetry and actions after sync
        authStore.triggerSyncUpdate();
        setTimeout(() => { syncSuccess.value = false; }, 5000);
      } else if (job.state === 'FAILED' || job.state === 'CANCELLED') {
        stopPolling();
        syncingAccount.value = null;
        syncError.value = job.error?.message || job.error?.code || 'Sync failed';
      }
    } catch (e) {
      console.error('Error polling job:', e);
    }
  }, 2000);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

// Data formatters
const formatTrend = (trend) => {
  if (trend == null) return '-';
  const sign = trend > 0 ? '+' : '';
  return `${sign}${(trend * 100).toFixed(1)}%`;
};

const getVerdictColor = (growth) => {
  if (growth === 'POSITIVE') return 'text-emerald-400';
  if (growth === 'NEGATIVE') return 'text-red-400';
  if (growth === 'STABLE') return 'text-amber-400';
  return 'text-gray-500';
};

onMounted(() => {
  fetchBrands();
});

onUnmounted(() => {
  stopPolling();
});

watch(() => authStore.activeBrand, (newBrand) => {
  if (newBrand) fetchDashboardData();
}, { immediate: true });
</script>