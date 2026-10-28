<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-8 pb-12">
    <!-- Header & Filters -->
    <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold mb-2 text-white">Content Analytics</h2>
        <p class="text-sm text-gray-400">Empirical performance data and macro interaction trends.</p>
      </div>

      <div class="flex flex-wrap gap-3 items-end bg-gray-900/50 p-4 rounded-xl border border-gray-800">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Format</label>
          <select v-model="filters.contentType" @change="fetchMetrics" class="bg-gray-950 border border-gray-800 text-white text-sm rounded-lg block w-32 p-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all">
            <option value="">All Types</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="CAROUSEL">Carousel</option>
            <option value="REEL">Reel</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">From</label>
          <input type="date" v-model="filters.from" @change="fetchMetrics" class="bg-gray-950 border border-gray-800 text-white text-sm rounded-lg block p-2 focus:border-indigo-500 outline-none">
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">To</label>
          <input type="date" v-model="filters.to" @change="fetchMetrics" class="bg-gray-950 border border-gray-800 text-white text-sm rounded-lg block p-2 focus:border-indigo-500 outline-none">
        </div>
        <button @click="clearFilters" class="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider px-2 py-2 transition-colors">Clear</button>
      </div>
    </div>
    
    <p v-if="filterError" class="text-sm text-amber-400 font-medium">{{ filterError }}</p>

    <!-- States -->
    <div v-if="loading" class="text-gray-400 animate-pulse bg-gray-900 p-8 rounded-xl border border-gray-800">
      Aggregating telemetry...
    </div>

    <div v-else-if="error" class="p-6 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400">
      <p>{{ error }}</p>
      <button @click="fetchMetrics" class="mt-4 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 rounded-lg text-white text-sm font-bold">Retry Connection</button>
    </div>

    <div v-else-if="!authStore.activeBrand" class="p-12 bg-gray-900 rounded-xl border border-gray-800 text-center">
      <h3 class="text-xl font-bold mb-2 text-white">No Brand Selected</h3>
      <p class="text-gray-400">Select a brand context to view empirical analytics.</p>
    </div>

    <div v-else-if="!hasData" class="p-12 bg-gray-900/50 rounded-xl border border-gray-800 text-center flex flex-col items-center">
      <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <span class="text-2xl">∅</span>
      </div>
      <h3 class="text-xl font-bold mb-2 text-white">No Telemetry Found</h3>
      <p class="text-gray-400 max-w-sm">There is no content data matching your current filters. Sync new posts or clear your date range.</p>
    </div>

    <!-- Populated Dashboard -->
    <div v-else class="space-y-6">
      
      <div v-if="hasPartialData" class="p-4 bg-amber-900/20 border border-amber-900/50 rounded-xl text-amber-400 text-sm flex items-center gap-3">
        <span class="font-bold">⚠ Partial Data:</span> Some content items lack complete source metrics. These are excluded from macro averages.
      </div>

      <!-- AI Executive Brief (Replaces the split Trend cards) -->
      <div v-if="metricsData.comparisons" class="bg-gray-900 border border-gray-800 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2 block">Macro Velocity Verdict</span>
          <h3 class="text-2xl sm:text-3xl font-bold text-white mb-2 uppercase tracking-wide" :class="getVerdictColor(metricsData.comparisons.growth)">
            {{ metricsData.comparisons.growth || 'Insufficient Data' }}
          </h3>
          <p class="text-sm text-gray-400 max-w-md">
            Your content interaction rate is trending <strong class="text-gray-200">{{ formatTrend(metricsData.comparisons.interactionRateTrend) }}</strong> relative to your historical baseline in this period.
          </p>
        </div>
        <div class="shrink-0 p-4 bg-gray-950 rounded-xl border border-gray-800 text-center min-w-[140px]">
          <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Delta</div>
          <div class="text-3xl font-bold" :class="getVerdictColor(metricsData.comparisons.growth)">
            {{ formatTrend(metricsData.comparisons.interactionRateTrend) }}
          </div>
        </div>
      </div>

      <!-- KPI Grid -->
      <div v-if="metricsData.overview" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Primary Metrics -->
        <div class="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col justify-center space-y-6">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Analyzed Assets</div>
            <div class="text-4xl font-bold text-white">{{ metricsData.overview.totalContent }}</div>
          </div>
          <div class="h-px w-full bg-gray-800"></div>
          <div>
            <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Average Reach</div>
            <div class="text-4xl font-bold text-white">{{ formatNumber(metricsData.overview.avgReach) }}</div>
          </div>
          <div class="h-px w-full bg-gray-800"></div>
          <div>
            <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Avg Interaction Rate</div>
            <div class="text-4xl font-bold text-indigo-400">{{ formatPercent(metricsData.overview.avgInteractionRate) }}</div>
          </div>
        </div>

        <!-- Secondary Diagnostics Grid -->
        <div class="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6">Secondary Conversion Metrics</div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div class="p-4 bg-gray-950 rounded-lg border border-gray-800/50">
              <div class="text-xs text-gray-500 mb-1">Impressions</div>
              <div class="text-xl font-bold text-gray-200">{{ formatNumber(metricsData.overview.avgImpressions) }}</div>
            </div>
            <div class="p-4 bg-gray-950 rounded-lg border border-gray-800/50">
              <div class="text-xs text-gray-500 mb-1">Like Rate</div>
              <div class="text-xl font-bold text-gray-200">{{ formatPercent(metricsData.overview.avgLikeRate) }}</div>
            </div>
            <div class="p-4 bg-gray-950 rounded-lg border border-gray-800/50">
              <div class="text-xs text-gray-500 mb-1">Comment Rate</div>
              <div class="text-xl font-bold text-gray-200">{{ formatPercent(metricsData.overview.avgCommentRate) }}</div>
            </div>
            <div class="p-4 bg-gray-950 rounded-lg border border-gray-800/50">
              <div class="text-xs text-gray-500 mb-1">Save Rate</div>
              <div class="text-xl font-bold text-gray-200">{{ formatPercent(metricsData.overview.avgSaveRate) }}</div>
            </div>
            <div class="p-4 bg-gray-950 rounded-lg border border-gray-800/50">
              <div class="text-xs text-gray-500 mb-1">Share Rate</div>
              <div class="text-xl font-bold text-gray-200">{{ formatPercent(metricsData.overview.avgShareRate) }}</div>
            </div>
            <div class="p-4 bg-gray-950 rounded-lg border border-gray-800/50">
              <div class="text-xs text-gray-500 mb-1">View/Reach Ratio</div>
              <div class="text-xl font-bold text-gray-200">{{ formatNumber(metricsData.overview.avgViewToReachRatio, 2) }}</div>
            </div>
          </div>
        </div>

      </div>

      <!-- Content Performance Log -->
      <div v-if="metricsData.series && metricsData.series.length > 0" class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
        <div class="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
          <h3 class="text-sm font-bold text-white uppercase tracking-wider">Asset Performance Log</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-gray-300">
            <thead class="text-[10px] uppercase font-bold tracking-widest bg-gray-950 text-gray-500">
              <tr>
                <th scope="col" class="px-6 py-4">Publish Date</th>
                <th scope="col" class="px-6 py-4">Format</th>
                <th scope="col" class="px-6 py-4 text-right">Reach</th>
                <th scope="col" class="px-6 py-4 text-right">Interaction</th>
                <th scope="col" class="px-6 py-4 text-right">Cohort Rank</th>
                <th scope="col" class="px-6 py-4 text-right">Vs Baseline</th>
                <th scope="col" class="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              <tr v-for="row in metricsData.series" :key="row.contentId" class="hover:bg-gray-800/30 transition-colors">
                <td class="px-6 py-4 font-medium text-gray-200 whitespace-nowrap">
                  {{ formatDate(row.date) }}
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 bg-gray-800 text-[10px] font-bold rounded uppercase tracking-wider text-gray-400">{{ row.type }}</span>
                </td>
                <td class="px-6 py-4 text-right font-medium">
                  {{ formatNumber(row.reach) }}
                </td>
                <td class="px-6 py-4 text-right font-bold text-white">
                  {{ formatPercent(row.interactionRate) }}
                </td>
                <td class="px-6 py-4 text-right">
                  <span v-if="row.percentileComparison?.interactionRate != null" class="text-indigo-400 font-bold bg-indigo-400/10 px-2 py-1 rounded text-xs">
                    P{{ row.percentileComparison.interactionRate }}
                  </span>
                  <span v-else class="text-gray-600">-</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div v-if="row.baselineComparison" class="flex justify-end">
                    <span class="text-xs font-bold px-2 py-1 rounded flex items-center gap-1" :class="getBadgeColor(row.baselineComparison.performance)">
                      {{ getBaselineSymbol(row.baselineComparison.performance) }} {{ formatPercent(Math.abs(row.baselineComparison.interactionRateDelta)) }}
                    </span>
                  </div>
                  <span v-else class="text-gray-600">-</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <router-link :to="`/content/${row.contentId}`" class="text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider">
                    View →
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading = ref(false);
const error = ref(null);
const filterError = ref(null);
const metricsData = ref({});
const filters = ref({
  contentType: '',
  from: '',
  to: ''
});
let activeRequestController = null;
const analyticsUnavailableMessage = 'Telemetry stream unavailable. Please check your connection.';

const parseJsonResponse = async response => {
  const body = await response.text();
  if (!body) return null;
  try { return JSON.parse(body); } catch { return null; }
};

const clearFilters = () => {
  filters.value = { contentType: '', from: '', to: '' };
  fetchMetrics();
};

const validateFilters = () => {
  filterError.value = null;
  if (filters.value.from && filters.value.to && filters.value.from > filters.value.to) {
    filterError.value = 'Chronological error: From date must precede To date.';
    return false;
  }
  return true;
};

const toFilterIso = (dateString, endOfDay = false) => {
  const time = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${dateString}${time}`).toISOString();
};

const ensureActiveBrand = async signal => {
  if (authStore.activeBrand) return true;
  const res = await fetch('/api/v2/brands', { credentials: 'include', signal });
  if (!res.ok) throw new Error('Could not synchronize brand context');
  const { data } = await res.json();
  const brand = data?.brands?.[0];
  if (brand) authStore.setActiveBrand(brand);
  return Boolean(brand);
};

const fetchMetrics = async () => {
  if (!validateFilters()) return;

  activeRequestController?.abort();
  const requestController = new AbortController();
  activeRequestController = requestController;
  
  loading.value = true;
  error.value = null;
  
  try {
    const hasBrand = await ensureActiveBrand(requestController.signal);
    if (!hasBrand) {
      metricsData.value = {};
      return;
    }

    const queryParams = new URLSearchParams();
    if (filters.value.contentType) queryParams.append('contentType', filters.value.contentType);
    if (filters.value.from) queryParams.append('from', toFilterIso(filters.value.from));
    if (filters.value.to) queryParams.append('to', toFilterIso(filters.value.to, true));

    const qs = queryParams.toString();
    const url = `/api/v2/brands/${authStore.activeBrand.id}/analytics/overview${qs ? '?' + qs : ''}`;

    const res = await fetch(url, { credentials: 'include', signal: requestController.signal });
    const payload = await parseJsonResponse(res);

    if (!res.ok) throw new Error(payload?.message || payload?.error?.message || analyticsUnavailableMessage);
    if (!payload?.data) throw new Error(analyticsUnavailableMessage);

    if (requestController.signal.aborted || activeRequestController !== requestController) return;
    metricsData.value = payload.data || {};
  } catch (e) {
    if (e.name === 'AbortError') return;
    error.value = e instanceof TypeError ? analyticsUnavailableMessage : (e.message || analyticsUnavailableMessage);
  } finally {
    if (activeRequestController === requestController) {
      activeRequestController = null;
      loading.value = false;
    }
  }
};

const hasData = computed(() => {
  return metricsData.value && metricsData.value.overview && metricsData.value.overview.totalContent > 0;
});

const hasPartialData = computed(() => {
  const rows = metricsData.value?.series || [];
  return rows.some(row => [
    row.reach, row.impressions, row.plays, row.likeRate, 
    row.commentRate, row.saveRate, row.shareRate, 
    row.interactionRate, row.viewToReachRatio
  ].some(value => value == null));
});

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatNumber = (num, decimals = 0) => {
  const numericValue = Number(num);
  if (!Number.isFinite(numericValue)) return '-';
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

// FIXED: Using template literals to ensure valid percentage strings instead of trailing slashes.
const formatPercent = (num) => {
  if (num == null) return '-';
  return `${(num * 100).toFixed(2)}%`;
};

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

const getBadgeColor = (performance) => {
  if (performance === 'ABOVE') return 'text-emerald-400 bg-emerald-400/10';
  if (performance === 'BELOW') return 'text-red-400 bg-red-400/10';
  return 'text-amber-400 bg-amber-400/10';
};

const getBaselineSymbol = (performance) => {
  if (performance === 'ABOVE') return '▲';
  if (performance === 'BELOW') return '▼';
  return '•';
};

onMounted(fetchMetrics);
onUnmounted(() => activeRequestController?.abort());
watch(() => authStore.activeBrand, fetchMetrics);
</script>