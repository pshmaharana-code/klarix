<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Content</h1>
      <!-- Filters -->
      <div class="flex space-x-2 bg-gray-800 p-1 rounded-lg">
        <button 
          v-for="filter in ['ALL', 'REEL', 'IMAGE', 'VIDEO', 'CAROUSEL']" 
          :key="filter"
          @click="setFilter(filter)"
          :class="[
            'px-4 py-1 text-sm font-medium rounded-md transition-colors',
            currentFilter === filter ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
          ]"
        >
          {{ filter }}
        </button>
      </div>
    </div>

    <!-- States -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="bg-gray-800 rounded-xl border border-gray-700 h-64 animate-pulse"></div>
    </div>

    <div v-else-if="error" class="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-center">
      <p class="text-red-400">{{ error }}</p>
      <button @click="fetchContent" class="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-white text-sm transition-colors">Try Again</button>
    </div>

    <div v-else-if="contentList.length === 0" class="text-center py-20 bg-gray-800/50 rounded-xl border border-gray-800">
      <div class="w-16 h-16 bg-gray-800 rounded-full mx-auto flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
      <h2 class="text-xl font-bold mb-2">No content found</h2>
      <p class="text-gray-400">Content will appear here after synchronization.</p>
    </div>

    <!-- Content Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <router-link 
        v-for="item in contentList" 
        :key="item.id" 
        :to="'/content/' + item.id"
        class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-500 transition-colors group flex flex-col"
      >
        <!-- Thumbnail -->
        <div class="aspect-video bg-gray-900 relative overflow-hidden flex items-center justify-center border-b border-gray-700">
          <img 
            v-if="getThumbnail(item)" 
            :src="getThumbnail(item)" 
            alt="Content Thumbnail" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
          <div v-else class="text-gray-600">No Media</div>
          
          <div class="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold uppercase">
            {{ item.type }}
          </div>
        </div>

        <!-- Details -->
        <div class="p-4 flex-1 flex flex-col">
          <div class="text-xs text-gray-400 mb-2">{{ formatDate(item.publishedAt) }}</div>
          <p class="text-sm text-gray-200 line-clamp-2 mb-4 flex-1">
            {{ item.caption || 'No caption' }}
          </p>
          
          <!-- Metrics -->
          <div v-if="getLatestMetrics(item)" class="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-700">
            <div v-if="getLatestMetrics(item).reach !== null" class="flex flex-col">
              <span class="text-lg font-bold">{{ formatNumber(getLatestMetrics(item).reach) }}</span>
              <span class="text-[10px] text-gray-500 uppercase tracking-wider">Reach</span>
            </div>
            <div v-if="getLatestMetrics(item).likes !== null" class="flex flex-col">
              <span class="text-lg font-bold">{{ formatNumber(getLatestMetrics(item).likes) }}</span>
              <span class="text-[10px] text-gray-500 uppercase tracking-wider">Likes</span>
            </div>
            <div v-if="getLatestMetrics(item).comments !== null" class="flex flex-col">
              <span class="text-lg font-bold">{{ formatNumber(getLatestMetrics(item).comments) }}</span>
              <span class="text-[10px] text-gray-500 uppercase tracking-wider">Comments</span>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Pagination -->
    <div v-if="hasMore" class="flex justify-center pt-4">
      <button 
        @click="loadMore" 
        :disabled="loadingMore"
        class="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {{ loadingMore ? 'Loading...' : 'Load More' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const contentList = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(null);
const currentFilter = ref('ALL');
const hasMore = ref(false);
const nextCursor = ref(null);

const fetchContent = async (isLoadMore = false) => {
  if (!authStore.activeBrand) return;

  if (isLoadMore) {
    loadingMore.value = true;
  } else {
    loading.value = true;
    contentList.value = [];
  }
  error.value = null;

  try {
    const params = new URLSearchParams();
    if (currentFilter.value !== 'ALL') {
      params.append('type', currentFilter.value);
    }
    if (isLoadMore && nextCursor.value) {
      params.append('afterId', nextCursor.value.afterId);
      if (nextCursor.value.afterPublishedAt) {
        params.append('afterPublishedAt', nextCursor.value.afterPublishedAt);
      }
    }

    const res = await fetch(`http://localhost:3001/api/v2/brands/${authStore.activeBrand.id}/content?${params.toString()}`, {
      credentials: 'include'
    });
    
    if (!res.ok) {
      throw new Error('Failed to load content');
    }

    const json = await res.json();
    
    if (isLoadMore) {
      contentList.value = [...contentList.value, ...json.data];
    } else {
      contentList.value = json.data;
    }
    
    hasMore.value = json.pagination.hasMore;
    nextCursor.value = json.pagination.nextCursor;
  } catch (e) {
    console.error('Error fetching content:', e);
    error.value = 'We encountered an error loading your content. Please try again.';
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const setFilter = (filter) => {
  if (currentFilter.value === filter) return;
  currentFilter.value = filter;
  fetchContent();
};

const loadMore = () => {
  fetchContent(true);
};

const getThumbnail = (item) => {
  if (!item.media || item.media.length === 0) return null;
  return item.media[0].sourceUrl;
};

const getLatestMetrics = (item) => {
  if (!item.metricSnapshots || item.metricSnapshots.length === 0) return null;
  return item.metricSnapshots[0];
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown Date';
  return new Date(dateString).toLocaleString(undefined, { 
    year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

onMounted(() => {
  if (authStore.activeBrand) {
    fetchContent();
  }
});

watch(() => authStore.activeBrand, (newBrand) => {
  if (newBrand) {
    fetchContent();
  }
});
</script>
