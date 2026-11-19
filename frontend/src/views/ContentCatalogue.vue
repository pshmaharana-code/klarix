<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-6 pb-12">
    <!-- Header & Segmented Format Filters -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border-hairline">
      <div>
        <p class="klx-mono-label text-volt-ink mb-1.5">01 / Content Catalogue</p>
        <h1 class="font-display font-extrabold text-3xl sm:text-4xl tracking-[-0.03em] text-ink leading-none">
          Synced Media Archive
        </h1>
      </div>

      <!-- Sharp Machined Filter Bar -->
      <div class="inline-flex flex-wrap gap-1 bg-surface border border-border-strong p-1 rounded-[2px] self-start md:self-auto">
        <button
          v-for="filter in formatFilters"
          :key="filter"
          type="button"
          @click="setFilter(filter)"
          class="px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider rounded-[2px] transition-colors cursor-pointer"
          :class="
            currentFilter === filter
              ? 'bg-ink text-surface'
              : 'text-ink-secondary hover:text-ink hover:bg-canvas'
          "
        >
          {{ filter }}
        </button>
      </div>
    </div>

    <!-- Loading Skeleton Grid -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 6" :key="i" class="klx-card overflow-hidden">
        <div class="aspect-[4/5] klx-skeleton rounded-none"></div>
        <div class="p-4 space-y-3">
          <div class="klx-skeleton h-3 w-24"></div>
          <div class="klx-skeleton h-4 w-full"></div>
          <div class="klx-skeleton h-4 w-2/3"></div>
          <div class="pt-3 border-t border-border-hairline grid grid-cols-3 gap-2">
            <div class="klx-skeleton h-8"></div>
            <div class="klx-skeleton h-8"></div>
            <div class="klx-skeleton h-8"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      role="alert"
      class="klx-card p-8 border-status-negative/40 bg-status-negative-bg/40 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-surface border border-status-negative/40 rounded-[2px] flex items-center justify-center mb-4">
        <AlertCircle class="w-5 h-5 text-status-negative" :stroke-width="2" />
      </div>
      <p class="text-sm font-semibold text-status-negative">{{ error }}</p>
      <button
        type="button"
        @click="fetchContent(false)"
        class="mt-4 klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Retry Fetch</span>
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="contentList.length === 0"
      class="klx-card p-12 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-canvas border border-border-hairline rounded-[2px] flex items-center justify-center mb-4">
        <Grid3x3 class="w-5 h-5 text-ink-muted" :stroke-width="1.75" />
      </div>
      <h2 class="font-display font-bold text-xl text-ink">
        {{ currentFilter === 'ALL' ? 'No synced content yet' : `No ${currentFilter.toLowerCase()} assets found` }}
      </h2>
      <p class="mt-1.5 text-sm text-ink-secondary max-w-md">
        {{
          currentFilter === 'ALL'
            ? 'Connect your Instagram Professional account and run a telemetry sync to populate your catalogue.'
            : 'Switch back to ALL formats or sync your latest posts from the Command Center.'
        }}
      </p>
      <div class="mt-6 flex items-center gap-3">
        <button
          v-if="currentFilter !== 'ALL'"
          type="button"
          @click="setFilter('ALL')"
          class="klx-btn-outline px-4 py-2.5 text-xs font-mono uppercase tracking-wider"
        >
          Show All Formats
        </button>
        <router-link
          v-else
          to="/onboarding/connect"
          class="klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
        >
          <span>Connect Instagram</span>
        </router-link>
      </div>
    </div>

    <!-- Content Gallery Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <router-link
        v-for="item in contentList"
        :key="item.id"
        :to="`/content/${item.id}`"
        class="klx-card klx-card-interactive overflow-hidden group flex flex-col"
      >
        <!-- Thumbnail Frame (4:5 Instagram-Native Aspect) -->
        <div class="aspect-[4/5] bg-surface-subtle relative overflow-hidden border-b border-border-hairline flex items-center justify-center">
          <img
            v-if="getThumbnail(item)"
            :src="getThumbnail(item)"
            :alt="item.caption ? item.caption.slice(0, 60) : 'Content thumbnail'"
            loading="lazy"
            class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
          <div v-else class="flex flex-col items-center gap-2 text-ink-muted">
            <ImageOff class="w-6 h-6" :stroke-width="1.5" />
            <span class="klx-mono-label">No Preview</span>
          </div>

          <!-- Top Overlay Badges -->
          <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <!-- AI Analysis Status Badge -->
            <span
              class="klx-badge border backdrop-blur-sm"
              :class="getAnalysisBadge(item).classes"
            >
              <span
                class="w-1.5 h-1.5"
                :class="getAnalysisBadge(item).dot"
              ></span>
              <span>{{ getAnalysisBadge(item).label }}</span>
            </span>

            <!-- Format Badge -->
            <span class="klx-badge bg-obsidian/90 text-obsidian-ink border border-obsidian-border">
              {{ item.type }}
            </span>
          </div>
        </div>

        <!-- Card Body & Compact Telemetry Strip -->
        <div class="p-4 flex-1 flex flex-col justify-between gap-4 bg-surface">
          <div>
            <div class="font-mono text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">
              {{ formatDate(item.publishedAt) }}
            </div>
            <p class="text-sm font-medium text-ink leading-snug line-clamp-2">
              {{ item.caption || 'No caption provided' }}
            </p>
          </div>

          <!-- Compact Geist Mono Metrics Strip -->
          <div class="pt-3 border-t border-border-hairline">
            <div v-if="getLatestMetrics(item)" class="grid grid-cols-3 gap-2">
              <div class="p-2 bg-canvas border border-border-hairline rounded-[2px]">
                <div class="font-mono text-[9px] uppercase tracking-wider text-ink-muted">Reach</div>
                <div class="mt-0.5 text-sm font-bold klx-kpi text-ink">
                  {{ formatNumber(getLatestMetrics(item).reach) }}
                </div>
              </div>
              <div class="p-2 bg-canvas border border-border-hairline rounded-[2px]">
                <div class="font-mono text-[9px] uppercase tracking-wider text-ink-muted">Likes</div>
                <div class="mt-0.5 text-sm font-bold klx-kpi text-ink">
                  {{ formatNumber(getLatestMetrics(item).likes) }}
                </div>
              </div>
              <div class="p-2 bg-canvas border border-border-hairline rounded-[2px]">
                <div class="font-mono text-[9px] uppercase tracking-wider text-ink-muted">Comments</div>
                <div class="mt-0.5 text-sm font-bold klx-kpi text-ink">
                  {{ formatNumber(getLatestMetrics(item).comments) }}
                </div>
              </div>
            </div>

            <div
              v-else
              class="py-2 px-3 bg-canvas border border-border-hairline rounded-[2px] text-[11px] font-mono text-ink-muted text-center"
            >
              Metrics unavailable (pre-business post)
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Pagination -->
    <div v-if="hasMore" class="flex justify-center pt-4">
      <button
        type="button"
        @click="loadMore"
        :disabled="loadingMore"
        class="klx-btn-outline px-6 py-3 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        <span v-if="loadingMore" class="klx-pulse-square !bg-ink"></span>
        <span>{{ loadingMore ? 'Loading More Assets...' : 'Load More Content' }}</span>
        <ArrowDown v-if="!loadingMore" class="w-3.5 h-3.5" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  Grid3x3,
  ImageOff,
  RefreshCw,
  AlertCircle,
  ArrowDown
} from 'lucide-vue-next'

const authStore = useAuthStore()

const formatFilters = ['ALL', 'REEL', 'IMAGE', 'VIDEO', 'CAROUSEL']
const contentList = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref(null)
const currentFilter = ref('ALL')
const hasMore = ref(false)
const nextCursor = ref(null)

const ensureActiveBrand = async () => {
  if (authStore.activeBrand) return true
  try {
    const res = await fetch('/api/v2/brands', { credentials: 'include' })
    if (!res.ok) return false
    const { data } = await res.json()
    if (data?.brands?.length > 0) {
      authStore.setActiveBrand(data.brands[0])
      return true
    }
    return false
  } catch {
    return false
  }
}

const fetchContent = async (isLoadMore = false) => {
  if (!isLoadMore) {
    loading.value = true
    contentList.value = []
  } else {
    loadingMore.value = true
  }
  error.value = null

  try {
    const hasBrand = await ensureActiveBrand()
    if (!hasBrand) {
      loading.value = false
      loadingMore.value = false
      return
    }

    const params = new URLSearchParams()
    if (currentFilter.value !== 'ALL') {
      params.append('type', currentFilter.value)
    }
    if (isLoadMore && nextCursor.value) {
      params.append('afterId', nextCursor.value.afterId)
      if (nextCursor.value.afterPublishedAt) {
        params.append('afterPublishedAt', nextCursor.value.afterPublishedAt)
      }
    }

    const res = await fetch(
      `/api/v2/brands/${authStore.activeBrand.id}/content?${params.toString()}`,
      { credentials: 'include' }
    )

    if (!res.ok) {
      throw new Error('Failed to load content catalogue.')
    }

    const json = await res.json()

    if (isLoadMore) {
      contentList.value = [...contentList.value, ...(json.data || [])]
    } else {
      contentList.value = json.data || []
    }

    hasMore.value = Boolean(json.pagination?.hasMore)
    nextCursor.value = json.pagination?.nextCursor || null
  } catch (e) {
    console.error('Error fetching content:', e)
    error.value = 'Unable to load your content catalogue. Please try again.'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const setFilter = (filter) => {
  if (currentFilter.value === filter) return
  currentFilter.value = filter
  nextCursor.value = null
  fetchContent(false)
}

const loadMore = () => {
  fetchContent(true)
}

const getThumbnail = (item) => {
  if (!item.media || item.media.length === 0) return null
  const media = item.media[0]
  if (item.type === 'VIDEO' || item.type === 'REEL') {
    return media.thumbnailUrl || media.sourceUrl || null
  }
  return media.sourceUrl || media.thumbnailUrl || null
}

const getLatestMetrics = (item) => {
  if (!item.metricSnapshots || item.metricSnapshots.length === 0) return null
  const snapshot = item.metricSnapshots[0]
  if (snapshot.reach === null && snapshot.likes === null && snapshot.comments === null) {
    return null
  }
  return snapshot
}

const getAnalysisBadge = (item) => {
  const rawStatus = item.analyses?.[0]?.status || item.analysisStatus || 'NOT_STARTED'
  if (rawStatus === 'COMPLETED') {
    return {
      label: 'ANALYZED',
      classes: 'bg-surface/95 border-ink text-ink',
      dot: 'bg-status-positive'
    }
  }
  if (rawStatus === 'PARTIAL') {
    return {
      label: 'PARTIAL',
      classes: 'bg-status-warning-bg/95 border-status-warning/40 text-status-warning',
      dot: 'bg-status-warning'
    }
  }
  if (rawStatus === 'FAILED') {
    return {
      label: 'FAILED',
      classes: 'bg-status-negative-bg/95 border-status-negative/40 text-status-negative',
      dot: 'bg-status-negative'
    }
  }
  if (['PENDING', 'PROCESSING', 'QUEUED', 'IN_PROGRESS'].includes(rawStatus)) {
    return {
      label: 'PENDING',
      classes: 'bg-volt border-ink text-ink',
      dot: 'bg-ink'
    }
  }
  return {
    label: 'UNANALYZED',
    classes: 'bg-surface/90 border-border-hairline text-ink-muted',
    dot: 'bg-ink-muted'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown Date'
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatNumber = (num) => {
  if (num === null || num === undefined) return '—'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

onMounted(() => {
  fetchContent(false)
})

watch(
  () => authStore.activeBrand,
  (newBrand, oldBrand) => {
    if (newBrand && newBrand.id !== oldBrand?.id) {
      fetchContent(false)
    }
  }
)

watch(
  () => authStore.lastSyncTimestamp,
  () => {
    if (authStore.activeBrand) {
      fetchContent(false)
    }
  }
)
</script>