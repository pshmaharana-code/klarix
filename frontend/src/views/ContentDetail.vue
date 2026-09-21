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
            v-if="primaryMedia" 
            :src="primaryMedia.sourceUrl" 
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

      <!-- Current Metrics -->
      <div v-if="latestMetrics" class="space-y-4">
        <h2 class="text-xl font-bold">Latest Metrics</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="metric in metricDisplayList" :key="metric.key" class="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{{ metric.label }}</div>
            <div class="text-2xl font-bold">{{ formatNumber(latestMetrics[metric.key]) }}</div>
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
                <th class="px-4 py-3 font-semibold">Likes</th>
                <th class="px-4 py-3 font-semibold">Comments</th>
                <th class="px-4 py-3 font-semibold">Shares</th>
                <th class="px-4 py-3 font-semibold">Saves</th>
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
                <td class="px-4 py-3">{{ formatNumber(snap.likes) }}</td>
                <td class="px-4 py-3">{{ formatNumber(snap.comments) }}</td>
                <td class="px-4 py-3">{{ formatNumber(snap.shares) }}</td>
                <td class="px-4 py-3">{{ formatNumber(snap.saves) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const contentId = route.params.contentId;

const content = ref(null);
const loading = ref(true);
const error = ref(null);

const fetchDetail = async () => {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(`http://localhost:3001/api/v2/content/${contentId}`, {
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
    return content.value.media[0];
  }
  return null;
});

const latestMetrics = computed(() => {
  if (content.value && content.value.metricSnapshots && content.value.metricSnapshots.length > 0) {
    return content.value.metricSnapshots[0];
  }
  return null;
});

const metricDisplayList = computed(() => {
  if (!latestMetrics.value) return [];
  const items = [
    { key: 'reach', label: 'Reach' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'plays', label: 'Plays' },
    { key: 'likes', label: 'Likes' },
    { key: 'comments', label: 'Comments' },
    { key: 'shares', label: 'Shares' },
    { key: 'saves', label: 'Saves' },
  ];
  return items.filter(m => latestMetrics.value[m.key] !== null && latestMetrics.value[m.key] !== undefined);
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
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat().format(num);
};

onMounted(() => {
  fetchDetail();
});
</script>
