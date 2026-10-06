<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-8 pb-12">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold mb-2 text-white">Content Analytics</h2>
        <p class="text-gray-400">View quantitative overview, trends, and content performance.</p>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800">
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">Content Type</label>
          <select v-model="filters.contentType" @change="fetchMetrics" class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg block w-full p-2.5">
            <option value="">All Types</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="CAROUSEL">Carousel</option>
            <option value="REEL">Reel</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">From Date</label>
          <input type="date" v-model="filters.from" @change="fetchMetrics" class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg block w-full p-2.5">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">To Date</label>
          <input type="date" v-model="filters.to" @change="fetchMetrics" class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg block w-full p-2.5">
        </div>
        <div class="pt-5">
          <button @click="clearFilters" class="text-gray-400 hover:text-white text-sm underline">Clear</button>
        </div>
      </div>
      <p v-if="filterError" class="text-sm text-amber-300" role="alert">{{ filterError }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-gray-400 animate-pulse bg-gray-900 p-8 rounded-xl border border-gray-800">
      Loading analytics...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6 bg-red-900/50 border border-red-800 rounded-xl text-red-200">
      <h3 class="text-lg font-medium mb-2">Failed to load analytics</h3>
      <p>{{ error }}</p>
      <button type="button" @click="fetchMetrics" class="mt-4 px-3 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-sm font-medium">
        Retry
      </button>
    </div>

    <!-- Brand State -->
    <div v-else-if="!authStore.activeBrand" class="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
      <h3 class="text-xl font-bold mb-2">No Brand Selected</h3>
      <p class="text-gray-400">Create or select a brand before viewing analytics.</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasData" class="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
      <div class="w-16 h-16 bg-gray-800 rounded-full mx-auto flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
      </div>
      <h3 class="text-xl font-bold mb-2">No Content Data</h3>
      <p class="text-gray-400">No content metrics match the current filters or have been collected yet.</p>
    </div>

    <!-- Populated State -->
    <div v-else class="space-y-8">
      <div v-if="hasPartialData" class="p-4 bg-amber-900/30 border border-amber-800 rounded-xl text-amber-200 text-sm" role="status">
        Some content has incomplete source metrics. Missing values are shown as dashes and are excluded from averages.
      </div>
      
      <!-- Trend Overview -->
      <div v-if="metricsData.comparisons" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-900 p-6 rounded-xl border border-gray-800 flex flex-col items-start">
          <span class="text-gray-400 text-sm font-medium mb-1">Growth Indicator</span>
          <span class="text-3xl font-bold" :class="getGrowthColor(metricsData.comparisons.growth)">
            {{ metricsData.comparisons.growth || 'INSUFFICIENT DATA' }}
          </span>
          <p class="text-xs text-gray-500 mt-2">Based on interaction rate trends in the selected period.</p>
        </div>
        <div class="bg-gray-900 p-6 rounded-xl border border-gray-800 flex flex-col items-start">
          <span class="text-gray-400 text-sm font-medium mb-1">Interaction Rate Trend</span>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-white">
              {{ formatTrend(metricsData.comparisons.interactionRateTrend) }}
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-2">Relative change across the timeline.</p>
        </div>
      </div>

      <!-- Quantitative Overview -->
      <div v-if="metricsData.overview" class="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 class="text-lg font-medium text-white mb-4">Quantitative Overview</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 bg-gray-950 rounded-lg border border-gray-800">
            <div class="text-xs text-gray-400 mb-1">Total Content</div>
            <div class="text-xl font-bold text-white">{{ metricsData.overview.totalContent }}</div>
          </div>
          <div class="p-4 bg-gray-950 rounded-lg border border-gray-800">
            <div class="text-xs text-gray-400 mb-1">Avg Reach</div>
            <div class="text-xl font-bold text-white">{{ formatNumber(metricsData.overview.avgReach) }}</div>
          </div>
          <div class="p-4 bg-gray-950 rounded-lg border border-gray-800">
            <div class="text-xs text-gray-400 mb-1">Avg Impressions</div>
            <div class="text-xl font-bold text-white">{{ formatNumber(metricsData.overview.avgImpressions) }}</div>
          </div>
          <div class="p-4 bg-gray-950 rounded-lg border border-gray-800">
            <div class="text-xs text-gray-400 mb-1">Avg Interaction Rate</div>
            <div class="text-xl font-bold text-white">{{ formatPercent(metricsData.overview.avgInteractionRate) }}</div>
          </div>
          <div class="p-4 bg-gray-950 rounded-lg border border-gray-800">
            <div class="text-xs text-gray-400 mb-1">Avg Like Rate</div>
            <div class="text-xl font-bold text-white">{{ formatPercent(metricsData.overview.avgLikeRate) }}</div>
          </div>
          <div class="p-4 bg-gray-950 rounded-lg border border-gray-800">
            <div class="text-xs text-gray-400 mb-1">Avg Comment Rate</div>
            <div class="text-xl font-bold text-white">{{ formatPercent(metricsData.overview.avgCommentRate) }}</div>
          </div>
          <div class="p-4 bg-gray-950 rounded-lg border border-gray-800">
            <div class="text-xs text-gray-400 mb-1">Avg Share Rate</div>
            <div class="text-xl font-bold text-white">{{ formatPercent(metricsData.overview.avgShareRate) }}</div>
          </div>
          <div class="p-4 bg-gray-950 rounded-lg border border-gray-800">
            <div class="text-xs text-gray-400 mb-1">Avg View-to-Reach Ratio</div>
            <div class="text-xl font-bold text-white">{{ formatNumber(metricsData.overview.avgViewToReachRatio, 2) }}</div>
          </div>
        </div>
      </div>

      <!-- Content Performance Table -->
      <div v-if="metricsData.series && metricsData.series.length > 0" class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div class="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 class="text-lg font-medium text-white">Content Performance</h3>
          <span class="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">Calculation Version: {{ metricsData.overview.calculationVersion }}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-gray-400">
            <thead class="text-xs uppercase bg-gray-950 text-gray-500">
              <tr>
                <th scope="col" class="px-6 py-3">Date</th>
                <th scope="col" class="px-6 py-3">Type</th>
                <th scope="col" class="px-6 py-3 text-right">Reach</th>
                <th scope="col" class="px-6 py-3 text-right">Interaction Rate</th>
                <th scope="col" class="px-6 py-3 text-right">Percentile</th>
                <th scope="col" class="px-6 py-3 text-right">Vs Baseline</th>
                <th scope="col" class="px-6 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in metricsData.series" :key="row.contentId" class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <td class="px-6 py-4 font-medium text-white whitespace-nowrap">
                  {{ formatDate(row.date) }}
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 bg-gray-800 text-xs rounded uppercase">{{ row.type }}</span>
                </td>
                <td class="px-6 py-4 text-right">
                  {{ formatNumber(row.reach) }}
                </td>
                <td class="px-6 py-4 text-right text-white font-medium">
                  {{ formatPercent(row.interactionRate) }}
                </td>
                <td class="px-6 py-4 text-right">
                  <span v-if="row.percentileComparison?.interactionRate !== null && row.percentileComparison?.interactionRate !== undefined" class="text-blue-400">P{{ row.percentileComparison.interactionRate }}</span>
                  <span v-else class="text-gray-600">-</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div v-if="row.baselineComparison" class="flex flex-col items-end">
                    <span :class="getBaselineColor(row.baselineComparison.performance)">
                      {{ getBaselineSymbol(row.baselineComparison.performance) }} {{ formatPercent(Math.abs(row.baselineComparison.interactionRateDelta)) }}
                    </span>
                  </div>
                  <span v-else class="text-gray-600">-</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <router-link :to="`/content/${row.contentId}`" class="text-indigo-400 hover:text-indigo-300 underline text-xs">
                    View Post
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
const analyticsUnavailableMessage = 'Analytics is temporarily unavailable. Please try again.';

const parseJsonResponse = async response => {
  const body = await response.text();
  if (!body) return null;

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

const clearFilters = () => {
  filters.value = { contentType: '', from: '', to: '' };
  fetchMetrics();
};

const validateFilters = () => {
  filterError.value = null;
  if (filters.value.from && filters.value.to && filters.value.from > filters.value.to) {
    filterError.value = 'The From date must be on or before the To date.';
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
  if (!res.ok) throw new Error('Could not load your brands');

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
    // Convert the user's local calendar dates to UTC boundaries for the API.
    if (filters.value.from) {
      queryParams.append('from', toFilterIso(filters.value.from));
    }
    if (filters.value.to) {
      queryParams.append('to', toFilterIso(filters.value.to, true));
    }

    const qs = queryParams.toString();
    const url = `/api/v2/brands/${authStore.activeBrand.id}/analytics/overview${qs ? '?' + qs : ''}`;

    const res = await fetch(url, { credentials: 'include', signal: requestController.signal });
    const payload = await parseJsonResponse(res);

    if (!res.ok) {
      throw new Error(payload?.message || payload?.error?.message || analyticsUnavailableMessage);
    }

    if (!payload?.data) throw new Error(analyticsUnavailableMessage);

    const { data } = payload;
    if (requestController.signal.aborted || activeRequestController !== requestController) return;
    metricsData.value = data || {};
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
    row.reach,
    row.impressions,
    row.plays,
    row.likeRate,
    row.commentRate,
    row.saveRate,
    row.shareRate,
    row.interactionRate,
    row.viewToReachRatio
  ]
    .some(value => value === null || value === undefined));
});

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatNumber = (num, decimals = 0) => {
  const numericValue = Number(num);
  if (!Number.isFinite(numericValue)) return '-';
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

const formatPercent = (num) => {
  if (num === null || num === undefined) return '-';
  return (num * 100).toFixed(2) + '%';
};

const formatTrend = (trend) => {
  if (trend === null || trend === undefined) return 'N/A';
  const sign = trend > 0 ? '+' : '';
  return sign + (trend * 100).toFixed(1) + '%';
};

const getGrowthColor = (growth) => {
  if (growth === 'POSITIVE') return 'text-green-400';
  if (growth === 'NEGATIVE') return 'text-red-400';
  if (growth === 'STABLE') return 'text-yellow-400';
  return 'text-gray-500';
};

const getBaselineColor = (performance) => {
  if (performance === 'ABOVE') return 'text-green-400';
  if (performance === 'BELOW') return 'text-red-400';
  return 'text-yellow-400';
};

const getBaselineSymbol = (performance) => {
  if (performance === 'ABOVE') return '▲';
  if (performance === 'BELOW') return '▼';
  return '•';
};

onMounted(() => {
  fetchMetrics();
});

onUnmounted(() => {
  activeRequestController?.abort();
});

watch(() => authStore.activeBrand, () => {
  fetchMetrics();
});
</script>
