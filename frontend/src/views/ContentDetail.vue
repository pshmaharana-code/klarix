<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-20">
    <!-- Header Navigation -->
    <div class="flex items-center space-x-4 border-b border-gray-800 pb-4">
      <router-link to="/content" class="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        <span>Back to Content</span>
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-8 bg-gray-800 rounded w-1/3"></div>
      <div class="aspect-video bg-gray-800 rounded-xl"></div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="h-24 bg-gray-800 rounded-xl" v-for="i in 4" :key="i"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-center">
      <p class="text-red-400">{{ error }}</p>
      <button @click="fetchDetail" class="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-white text-sm transition-colors">Try Again</button>
    </div>

    <!-- Content Detail -->
    <div v-else-if="content" class="space-y-8">
      
      <!-- Top Section: Media & Metadata -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Media -->
        <div class="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 aspect-video flex items-center justify-center relative">
          <img 
            v-if="primaryMedia && primaryMedia.displayUrl" 
            :src="primaryMedia.displayUrl" 
            alt="Content Media" 
            class="w-full h-full object-cover" 
          />
          <div v-else class="text-gray-500 flex flex-col items-center">
            <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span>No Media Available</span>
          </div>
          <div class="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-semibold uppercase">
            {{ content.type }}
          </div>
        </div>

        <!-- Info -->
        <div class="flex flex-col space-y-4">
          <div>
            <h2 class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Published</h2>
            <div class="text-lg text-gray-200">{{ formatDate(content.publishedAt) }}</div>
          </div>
          
          <div class="flex-1 bg-gray-800/50 rounded-xl p-4 border border-gray-800">
            <h2 class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Caption</h2>
            <p class="text-sm text-gray-300 whitespace-pre-wrap break-words">
              {{ content.caption || 'No caption provided.' }}
            </p>
          </div>

          <div v-if="content.permalink">
            <a :href="content.permalink" target="_blank" class="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
              <span>View on Platform</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Post Analysis Section (Phase 4) -->
      <div v-if="latestAnalysis" class="space-y-4">
        <h2 class="text-xl font-bold flex items-center justify-between">
          <span>AI Analysis</span>
          <span :class="{'text-green-400': latestAnalysis.status === 'COMPLETED', 'text-yellow-400': latestAnalysis.status === 'PARTIAL', 'text-red-400': latestAnalysis.status === 'FAILED'}" class="text-xs font-semibold uppercase px-2 py-1 bg-gray-900 rounded border border-gray-700">
            {{ latestAnalysis.status }} ({{ (latestAnalysis.confidence * 100).toFixed(0) }}% confidence)
          </span>
        </h2>
        
        <div v-if="latestAnalysis.status === 'FAILED'" class="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
          <p class="text-red-400">Analysis failed to complete.</p>
        </div>
        <div v-else>
          <div v-if="latestAnalysis.status === 'PARTIAL' && latestAnalysis.providerMeta?.error" class="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 mb-4 flex items-start space-x-3 text-yellow-500 text-sm">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <strong class="text-yellow-400">Analysis incomplete.</strong> The AI provider experienced a temporary issue analyzing some media.
              <div class="text-xs text-yellow-600/80 mt-1 font-mono break-words">{{ latestAnalysis.providerMeta.error }}</div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Visual Findings -->
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col space-y-2">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Visual</h3>
            <template v-if="latestAnalysis.visualFindings">
              <p class="text-sm text-gray-400"><strong class="text-gray-200">Format:</strong> {{ latestAnalysis.visualFindings.format_classification || 'N/A' }}</p>
              <p class="text-sm text-gray-400"><strong class="text-gray-200">Hook:</strong> {{ latestAnalysis.visualFindings.hook_strength || 'N/A' }}</p>
              <p class="text-sm text-gray-400"><strong class="text-gray-200">Quality:</strong> {{ latestAnalysis.visualFindings.visual_quality || 'N/A' }}</p>
            </template>
            <p v-else class="text-sm text-yellow-500 italic">Visual analysis unavailable.</p>
          </div>

          <!-- Content Findings -->
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col space-y-2">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Content</h3>
            <template v-if="latestAnalysis.contentFindings">
              <p class="text-sm text-gray-400"><strong class="text-gray-200">Themes:</strong> {{ latestAnalysis.contentFindings.themes?.join(', ') || 'N/A' }}</p>
              <p class="text-sm text-gray-400"><strong class="text-gray-200">Narrative:</strong> {{ latestAnalysis.contentFindings.narrative_structure || 'N/A' }}</p>
              <p class="text-sm text-gray-400"><strong class="text-gray-200">Audience:</strong> {{ latestAnalysis.contentFindings.audience_signals?.join(', ') || 'N/A' }}</p>
            </template>
            <p v-else class="text-sm text-yellow-500 italic">Content analysis unavailable.</p>
          </div>

          <!-- Performance Findings -->
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col space-y-2">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Performance Interpretation</h3>
              <span v-if="latestAnalysis.providerMeta?.metricsObservedAt" class="text-[10px] text-gray-500 font-medium px-2 py-0.5 bg-gray-900 rounded border border-gray-700">
                Data from: {{ formatShortDate(latestAnalysis.providerMeta.metricsObservedAt) }}
              </span>
            </div>
            <template v-if="latestAnalysis.perfFindings">
              <p class="text-sm text-gray-400">{{ latestAnalysis.perfFindings.metric_interpretation || 'N/A' }}</p>
              <div v-if="latestAnalysis.perfFindings.performance_factors?.length">
                <strong class="text-gray-200 text-sm">Factors:</strong>
                <ul class="list-disc list-inside text-sm text-gray-400 ml-1">
                  <li v-for="factor in latestAnalysis.perfFindings.performance_factors" :key="factor">{{ factor }}</li>
                </ul>
              </div>
            </template>
            <p v-else class="text-sm text-yellow-500 italic">Performance analysis unavailable.</p>
          </div>
          </div>
        </div>
      </div>
      <div v-else-if="content.analysisStatus !== 'NOT_STARTED'" class="bg-gray-800 rounded-xl p-6 text-center border border-gray-700 animate-pulse">
        <p class="text-gray-400">Analysis is {{ content.analysisStatus.toLowerCase() }}...</p>
      </div>

      <!-- Current Metrics -->
      <div v-if="latestMetrics" class="space-y-4">
        <h2 class="text-xl font-bold">Latest Metrics</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="metric in metricDisplayList" :key="metric.key" class="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{{ metric.label }}</div>
            <div class="text-2xl font-bold">{{ metric.format ? metric.format(latestMetrics[metric.key]) : formatNumber(latestMetrics[metric.key]) }}</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 text-right">
          Last observed: {{ formatDate(latestMetrics.observedAt) }}
        </div>
      </div>
      <div v-else class="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
        <p class="text-gray-400">No metrics available yet.</p>
      </div>

      <!-- Metric History Table -->
      <div v-if="content.metricSnapshots && content.metricSnapshots.length > 0" class="space-y-4">
        <h2 class="text-xl font-bold">Metric History</h2>
        <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
          <table class="w-full text-left text-sm text-gray-300">
            <thead class="text-xs text-gray-500 uppercase bg-gray-900 border-b border-gray-700">
              <tr>
                <th class="px-4 py-3 font-semibold">Observed At</th>
                <th class="px-4 py-3 font-semibold">Reach</th>
                <th class="px-4 py-3 font-semibold">Plays</th>
                <th class="px-4 py-3 font-semibold">Interactions</th>
                <th class="px-4 py-3 font-semibold">Likes</th>
                <th class="px-4 py-3 font-semibold">Comments</th>
                <th class="px-4 py-3 font-semibold">Shares</th>
                <th class="px-4 py-3 font-semibold">Saves</th>
                <th v-if="content.type === 'REEL'" class="px-4 py-3 font-semibold">Avg Watch</th>
                <th v-if="content.type === 'REEL'" class="px-4 py-3 font-semibold">Skip Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="snap in content.metricSnapshots" 
                :key="snap.id"
                class="border-b border-gray-800 hover:bg-gray-700/50 transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap">{{ formatShortDate(snap.observedAt) }}</td>
                <td class="px-4 py-3">{{ formatNumber(snap.reach) }}</td>
                <td class="px-4 py-3">{{ formatNumber(snap.plays) }}</td>
                <td class="px-4 py-3">
                  {{ formatNumber(snap.totalInteractions ?? (
                    (snap.likes != null && snap.comments != null && snap.saves != null && snap.shares != null) 
                      ? (snap.likes + snap.comments + snap.saves + snap.shares) : null
                  )) }}
                  <span v-if="snap.totalInteractions == null && snap.likes != null && snap.comments != null && snap.saves != null && snap.shares != null" class="text-xs text-gray-500 ml-1" title="Derived by Klarix">*</span>
                </td>
                <td class="px-4 py-3">{{ formatNumber(snap.likes) }}</td>
                <td class="px-4 py-3">{{ formatNumber(snap.comments) }}</td>
                <td class="px-4 py-3">{{ formatNumber(snap.shares) }}</td>
                <td class="px-4 py-3">{{ formatNumber(snap.saves) }}</td>
                <td v-if="content.type === 'REEL'" class="px-4 py-3 whitespace-nowrap">{{ formatTime(snap.igReelsAvgWatchTime) }}</td>
                <td v-if="content.type === 'REEL'" class="px-4 py-3 whitespace-nowrap">{{ formatPercentage(snap.reelsSkipRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const contentId = route.params.contentId;

const content = ref(null);
const loading = ref(true);
const error = ref(null);

const fetchDetail = async () => {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(`/api/v2/content/${contentId}`, {
      credentials: 'include'
    });
    
    if (res.status === 404) {
      throw new Error('Content not found or you do not have permission to view it.');
    }
    if (!res.ok) {
      throw new Error('Failed to load content details.');
    }

    const json = await res.json();
    content.value = json.data;
  } catch (e) {
    console.error('Error fetching content detail:', e);
    error.value = e.message || 'We encountered an error loading this content.';
  } finally {
    loading.value = false;
  }
};

const primaryMedia = computed(() => {
  if (content.value && content.value.media && content.value.media.length > 0) {
    const m = content.value.media[0];
    const type = content.value.type;
    return {
      ...m,
      displayUrl: (type === 'VIDEO' || type === 'REEL') ? (m.thumbnailUrl || null) : (m.thumbnailUrl || m.sourceUrl)
    };
  }
  return null;
});

const latestMetrics = computed(() => {
  if (content.value && content.value.metricSnapshots && content.value.metricSnapshots.length > 0) {
    const snap = { ...content.value.metricSnapshots[0] };
    if (snap.totalInteractions == null && snap.likes != null && snap.comments != null && snap.saves != null && snap.shares != null) {
      snap.totalInteractions = snap.likes + snap.comments + snap.saves + snap.shares;
      snap._isDerivedInteractions = true;
    }
    return snap;
  }
  return null;
});

const latestAnalysis = computed(() => {
  if (content.value && content.value.analyses && content.value.analyses.length > 0) {
    return content.value.analyses[0];
  }
  return null;
});

const metricDisplayList = computed(() => {
  if (!latestMetrics.value) return [];
  let items = [
    { key: 'reach', label: 'Reach', format: formatNumber }
  ];
  if (content.value?.type !== 'REEL') {
    items.push({ key: 'impressions', label: 'Impressions', format: formatNumber });
  }
  items.push(
    { key: 'plays', label: 'Plays', format: formatNumber },
    { key: 'totalInteractions', label: latestMetrics.value._isDerivedInteractions ? 'Total Interactions (Derived)' : 'Total Interactions', format: formatNumber },
    { key: 'likes', label: 'Likes', format: formatNumber },
    { key: 'comments', label: 'Comments', format: formatNumber },
    { key: 'shares', label: 'Shares', format: formatNumber },
    { key: 'saves', label: 'Saves', format: formatNumber }
  );
  if (content.value?.type === 'REEL') {
    items.push(
      { key: 'igReelsAvgWatchTime', label: 'Average Watch Time', format: formatTime },
      { key: 'igReelsVideoViewTotalTime', label: 'Total Video View Time', format: formatTime },
      { key: 'reelsSkipRate', label: 'Skip Rate', format: formatPercentage }
    );
  }
  return items;
});

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown Date';
  return new Date(dateString).toLocaleString(undefined, { 
    year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

const formatShortDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString(undefined, { 
    month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return '—';
  return new Intl.NumberFormat().format(num);
};

const formatTime = (ms) => {
  if (ms === null || ms === undefined) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatPercentage = (val) => {
  if (val === null || val === undefined) return '—';
  return `${val}%`;
};

onMounted(() => {
  fetchDetail();
});

watch(() => authStore.lastSyncTimestamp, () => {
  fetchDetail();
});
</script>
