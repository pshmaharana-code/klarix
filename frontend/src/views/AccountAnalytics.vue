<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-3xl font-bold mb-2">Account Analytics</h2>
        <p class="text-gray-400">View your daily reach and interaction metrics.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-gray-400 animate-pulse bg-gray-900 p-8 rounded-xl border border-gray-800">
      Loading metrics data...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6 bg-red-900/50 border border-red-800 rounded-xl text-red-200">
      <h3 class="text-lg font-medium mb-2">Failed to load analytics</h3>
      <p>{{ error }}</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!hasData" class="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
      <div class="w-16 h-16 bg-gray-800 rounded-full mx-auto flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
      </div>
      <h3 class="text-xl font-bold mb-2">No Data Available</h3>
      <p class="text-gray-400">No metrics have been collected for this brand yet. Ensure you have synced a social account.</p>
    </div>

    <!-- Populated State -->
    <div v-else class="space-y-8">
      
      <!-- Reach History (None Breakdown) -->
      <div v-if="dailyReach.length > 0" class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h3 class="text-lg font-medium text-white">Daily Reach Overview</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-gray-400">
            <thead class="text-xs uppercase bg-gray-950 text-gray-500">
              <tr>
                <th scope="col" class="px-6 py-3">Date</th>
                <th scope="col" class="px-6 py-3 text-right">Reach</th>
                <th scope="col" class="px-6 py-3 text-right">Interaction Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in dailyReach" :key="row.endTime" class="border-b border-gray-800 hover:bg-gray-800/50">
                <td class="px-6 py-4 font-medium text-white whitespace-nowrap">
                  {{ formatDate(row.endTime) }}
                </td>
                <td class="px-6 py-4 text-right">
                  {{ row.value.toLocaleString() }}
                </td>
                <td class="px-6 py-4 text-right">
                  <span v-if="row.interactionRate !== undefined && row.interactionRate !== null">{{ (row.interactionRate * 100).toFixed(2) }}%</span>
                  <span v-else class="text-gray-600 text-xs italic" title="Requires likes, comments, saves, shares, and reach at the account level">Not available — requires additional account metrics</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Reach Breakdown by Media Product Type -->
      <div v-if="breakdownRows.length > 0" class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h3 class="text-lg font-medium text-white">Reach by Media Type</h3>
        </div>

        <!-- Case 1: Breakdown has actual per-type dimension data -->
        <div v-if="breakdownDimensions.length > 0" class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="dim in breakdownDimensions" :key="dim.type" class="bg-gray-800 p-4 rounded-lg flex items-center justify-between border border-gray-700">
              <span class="font-medium capitalize text-gray-300">{{ dim.type.toLowerCase().replace(/_/g, ' ') }}</span>
              <span class="text-xl font-bold text-white">{{ dim.value.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Case 2: Breakdown rows exist but Meta didn't provide per-type splits -->
        <div v-else class="p-6">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-400">
              <thead class="text-xs uppercase bg-gray-950 text-gray-500">
                <tr>
                  <th scope="col" class="px-6 py-3">Date</th>
                  <th scope="col" class="px-6 py-3 text-right">Reach (All Media Types)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in breakdownRows" :key="row.endTime" class="border-b border-gray-800 hover:bg-gray-800/50">
                  <td class="px-6 py-4 font-medium text-white whitespace-nowrap">{{ formatDate(row.endTime) }}</td>
                  <td class="px-6 py-4 text-right">{{ row.value.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-gray-600 mt-4 italic">Per-media-type breakdown is not yet available from Meta for this account. This typically becomes available with higher reach volume.</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading = ref(false);
const error = ref(null);
const metricsData = ref([]);

const fetchMetrics = async () => {
  if (!authStore.activeBrand) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    const res = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/account-metrics`, {
      credentials: 'include'
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch metrics');
    }
    
    const { data } = await res.json();
    metricsData.value = data || [];
  } catch (e) {
    console.error('Metrics fetch error:', e);
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

// Derived state
const hasData = computed(() => metricsData.value.length > 0);

const dailyReach = computed(() => {
  // Get base reach metrics without breakdown
  const reachMetrics = metricsData.value.filter(m => 
    m.metricName === 'reach' && 
    m.period === 'day' && 
    m.breakdownDefinition === 'none'
  ).sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

  // Map interaction rate to the same row based on endTime
  return reachMetrics.map(r => {
    const intRateMetric = metricsData.value.find(m => 
      m.metricName === 'interactionRate' && 
      m.period === 'day' && 
      m.breakdownDefinition === 'none' && 
      m.endTime === r.endTime
    );
    return {
      ...r,
      interactionRate: intRateMetric ? intRateMetric.value : undefined
    };
  });
});

// All breakdown rows for media_product_type
const breakdownRows = computed(() => {
  return metricsData.value.filter(m => 
    m.metricName === 'reach' && 
    m.period === 'day' && 
    m.breakdownDefinition === 'media_product_type'
  ).sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
});

// Extract per-type dimension data from the most recent breakdown row (if Meta provided it)
const breakdownDimensions = computed(() => {
  if (breakdownRows.value.length === 0) return [];
  
  const latest = breakdownRows.value[0];
  if (!latest.breakdowns || !Array.isArray(latest.breakdowns) || latest.breakdowns.length === 0) return [];
  
  // Each breakdown has { dimension_keys, results: [{ dimension_values, value }] }
  const dims = [];
  for (const b of latest.breakdowns) {
    if (!Array.isArray(b.results)) continue;
    for (const r of b.results) {
      if (r.dimension_values && r.dimension_values.length > 0 && r.value != null) {
        dims.push({
          type: r.dimension_values[0],
          value: r.value,
          endTime: latest.endTime
        });
      }
    }
  }
  return dims;
});

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

onMounted(() => {
  fetchMetrics();
});

watch(() => authStore.activeBrand, () => {
  fetchMetrics();
});
</script>
