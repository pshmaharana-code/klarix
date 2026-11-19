<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-6 pb-12">
    <!-- Header & Primary Discovery Trigger -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border-hairline">
      <div>
        <p class="klx-mono-label text-volt-ink mb-1.5">03 / Pattern Discovery</p>
        <h1 class="font-display font-extrabold text-3xl sm:text-4xl tracking-[-0.03em] text-ink leading-none">
          Verified Signals
        </h1>
        <p class="mt-2 text-sm text-ink-secondary">
          Evidence-backed patterns extracted strictly from your analysed catalogue.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 shrink-0">
        <button
          type="button"
          @click="loadPatterns"
          :disabled="loading"
          class="klx-btn-outline px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider bg-surface"
          title="Refresh patterns"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" :stroke-width="1.75" />
          <span>Refresh</span>
        </button>

        <button
          type="button"
          class="klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
          :disabled="discovering || loading || !authStore.activeBrand"
          @click="discoverPatterns"
        >
          <span v-if="discovering" class="klx-pulse-square !bg-ink"></span>
          <Sparkles v-else class="w-3.5 h-3.5" :stroke-width="2" />
          <span>{{ discovering ? 'Running Discovery...' : 'Discover Patterns' }}</span>
        </button>
      </div>
    </div>

    <!-- Queued Discovery Status Notice -->
    <div
      v-if="queuedMessage"
      role="status"
      class="p-4 bg-volt-tint border border-ink rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium text-ink"
    >
      <div class="flex items-center gap-2.5">
        <span class="klx-pulse-square !bg-ink shrink-0"></span>
        <span>{{ queuedMessage }}</span>
      </div>
      <button
        type="button"
        @click="loadPatterns"
        class="klx-mono-label underline underline-offset-4 hover:text-volt-ink cursor-pointer shrink-0 self-start sm:self-auto"
      >
        Check Now &rarr;
      </button>
    </div>

    <!-- Category Filter Bar (Only shown when patterns exist) -->
    <div
      v-if="!loading && patterns.length > 0 && categoryFilters.length > 2"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <div class="inline-flex flex-wrap gap-1 bg-surface border border-border-strong p-1 rounded-[2px]">
        <button
          v-for="cat in categoryFilters"
          :key="cat"
          type="button"
          @click="selectedCategory = cat"
          class="px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider rounded-[2px] transition-colors cursor-pointer"
          :class="
            selectedCategory === cat
              ? 'bg-ink text-surface'
              : 'text-ink-secondary hover:text-ink hover:bg-canvas'
          "
        >
          {{ formatCategoryLabel(cat) }}
        </button>
      </div>

      <span class="klx-mono-label text-ink-muted">
        Showing {{ filteredPatterns.length }} of {{ patterns.length }} signals
      </span>
    </div>

    <!-- Loading Skeleton Grid -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="klx-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div class="klx-skeleton h-5 w-32"></div>
          <div class="klx-skeleton h-4 w-24"></div>
        </div>
        <div class="klx-skeleton h-6 w-3/4"></div>
        <div class="space-y-2">
          <div class="klx-skeleton h-4 w-full"></div>
          <div class="klx-skeleton h-4 w-5/6"></div>
        </div>
        <div class="pt-4 border-t border-border-hairline">
          <div class="klx-skeleton h-2 w-full"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      role="alert"
      class="klx-card p-8 border-status-negative/40 bg-status-negative-bg/40 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-surface border border-status-negative/35 rounded-[2px] flex items-center justify-center mb-4">
        <AlertCircle class="w-5 h-5 text-status-negative" :stroke-width="2" />
      </div>
      <h2 class="font-display font-bold text-lg text-status-negative">Failed to load patterns</h2>
      <p class="mt-1 text-sm text-status-negative/90 max-w-md">{{ error }}</p>
      <button
        type="button"
        @click="loadPatterns"
        class="mt-5 klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Retry</span>
      </button>
    </div>

    <!-- Insufficient Evidence Gate -->
    <div
      v-else-if="insufficientData"
      class="klx-card p-10 sm:p-12 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-status-warning-bg border border-status-warning/40 rounded-[2px] flex items-center justify-center mb-4">
        <AlertTriangle class="w-5 h-5 text-status-warning" :stroke-width="1.75" />
      </div>
      <span class="klx-mono-label text-status-warning mb-1.5">Evidence Gate Active</span>
      <h2 class="font-display font-bold text-2xl text-ink">More analysed posts required</h2>
      <p class="mt-2 text-sm text-ink-secondary max-w-lg leading-relaxed">
        {{ insufficientData }} Klarix blocks statistical pattern claims until enough verified posts exist to prevent false positives.
      </p>
      <router-link
        to="/content"
        class="mt-6 klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
      >
        <span>Inspect Content Catalogue</span>
        <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
      </router-link>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!patterns.length"
      class="klx-card p-10 sm:p-12 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-canvas border border-border-hairline rounded-[2px] flex items-center justify-center mb-4">
        <Sparkles class="w-5 h-5 text-ink-muted" :stroke-width="1.75" />
      </div>
      <h2 class="font-display font-bold text-2xl text-ink">No evidence-backed patterns yet</h2>
      <p class="mt-2 text-sm text-ink-secondary max-w-lg leading-relaxed">
        Once your posts are synced and audited, run discovery to surface repeatable hook, framing, and retention mechanics backed by your own data.
      </p>
      <button
        type="button"
        @click="discoverPatterns"
        :disabled="discovering || !authStore.activeBrand"
        class="mt-6 klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
      >
        <Sparkles class="w-3.5 h-3.5" :stroke-width="2" />
        <span>{{ discovering ? 'Running Discovery...' : 'Discover Patterns' }}</span>
      </button>
    </div>

    <!-- 2-Column Evidence-Backed Signal Cards -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <router-link
        v-for="pattern in filteredPatterns"
        :key="pattern.id"
        :to="`/patterns/${pattern.id}`"
        class="klx-card klx-card-interactive p-6 flex flex-col justify-between gap-5 group"
      >
        <div class="space-y-3.5">
          <!-- Top Metadata Strip -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="klx-badge bg-canvas border border-border-strong text-ink">
                {{ formatCategoryLabel(pattern.category) }}
              </span>
              <span
                v-if="pattern.isPromoted"
                class="klx-badge bg-status-positive-bg border border-status-positive/30 text-status-positive"
              >
                <Check class="w-3 h-3" :stroke-width="2.5" />
                <span>In Memory</span>
              </span>
            </div>

            <span class="klx-mono-label text-ink-muted">
              {{ pattern.evidenceCount ?? 0 }} {{ pattern.evidenceCount === 1 ? 'POST' : 'POSTS' }}
            </span>
          </div>

          <!-- Pattern Headline & Empirical Claim -->
          <div>
            <h2 class="font-display font-bold text-xl text-ink tracking-tight leading-snug group-hover:text-volt-ink transition-colors">
              {{ pattern.title || 'Discovered Pattern' }}
            </h2>
            <p class="mt-2 text-sm text-ink-secondary leading-relaxed line-clamp-3">
              {{ pattern.claim }}
            </p>
          </div>
        </div>

        <!-- Bottom Confidence Meter Bar & Drilldown -->
        <div class="pt-4 border-t border-border-hairline space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <span class="klx-mono-label text-ink-muted">Confidence Score</span>
            <span class="klx-kpi font-bold text-ink">
              {{ formatConfidence(pattern.confidence) }}
            </span>
          </div>

          <div class="w-full h-1.5 bg-surface-subtle overflow-hidden rounded-[1px]">
            <div
              class="h-full transition-all duration-300"
              :class="confidenceBarClass(pattern.confidence)"
              :style="{ width: `${clampConfidence(pattern.confidence)}%` }"
            ></div>
          </div>

          <div class="pt-1 flex items-center justify-between">
            <span class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Click to inspect cohort proof
            </span>
            <span class="inline-flex items-center gap-1 klx-mono-label text-ink group-hover:translate-x-0.5 transition-transform">
              <span>Inspect</span>
              <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
            </span>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Check
} from 'lucide-vue-next'

const authStore = useAuthStore()
const patterns = ref([])
const loading = ref(false)
const discovering = ref(false)
const error = ref(null)
const insufficientData = ref(null)
const queuedMessage = ref(null)
const selectedCategory = ref('ALL')

let refreshTimer = null

const categoryFilters = computed(() => {
  const unique = new Set(patterns.value.map((p) => p.category).filter(Boolean))
  return ['ALL', ...Array.from(unique)]
})

const filteredPatterns = computed(() => {
  if (selectedCategory.value === 'ALL') return patterns.value
  return patterns.value.filter((p) => p.category === selectedCategory.value)
})

const ensureActiveBrand = async () => {
  if (authStore.activeBrand) return true

  const response = await fetch('/api/v2/brands', { credentials: 'include' })
  if (!response.ok) throw new Error('Could not load your brand workspace.')
  const payload = await response.json()
  const brand = payload.data?.brands?.[0]
  if (brand) authStore.setActiveBrand(brand)
  return Boolean(brand)
}

const loadPatterns = async () => {
  loading.value = true
  error.value = null
  insufficientData.value = null

  try {
    if (!(await ensureActiveBrand())) {
      patterns.value = []
      return
    }

    const response = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/patterns`, {
      credentials: 'include'
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || 'Could not load patterns.')
    patterns.value = payload?.data?.items || []
    if (
      selectedCategory.value !== 'ALL' &&
      !patterns.value.some((p) => p.category === selectedCategory.value)
    ) {
      selectedCategory.value = 'ALL'
    }
  } catch (cause) {
    error.value = cause.message || 'Could not load patterns.'
  } finally {
    loading.value = false
  }
}

const discoverPatterns = async () => {
  discovering.value = true
  queuedMessage.value = null
  insufficientData.value = null
  error.value = null

  try {
    if (!(await ensureActiveBrand())) return

    const response = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/patterns/discover`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `patterns-ui-${Date.now()}`
      },
      body: JSON.stringify({ force: false })
    })
    const payload = await response.json().catch(() => null)

    if (response.status === 422 && payload?.error === 'INSUFFICIENT_DATA') {
      insufficientData.value = `${payload.data.sampleSize} of ${payload.data.minimumSampleSize} required analysed content items are available.`
      patterns.value = []
      return
    }
    if (!response.ok) throw new Error(payload?.message || 'Could not start pattern discovery.')

    queuedMessage.value =
      'Pattern discovery is queued. Klarix will publish only signals that clear the empirical evidence gate.'

    if (refreshTimer) window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(() => {
      loadPatterns()
    }, 2000)
  } catch (cause) {
    error.value = cause.message || 'Could not start pattern discovery.'
  } finally {
    discovering.value = false
  }
}

const clampConfidence = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, num <= 1 && num > 0 ? num * 100 : num))
}

const formatConfidence = (value) => {
  if (value == null) return '—'
  return `${clampConfidence(value).toFixed(0)}%`
}

const confidenceBarClass = (value) => {
  const pct = clampConfidence(value)
  if (pct >= 75) return 'bg-ink'
  if (pct >= 50) return 'bg-ink-secondary'
  return 'bg-status-warning'
}

const formatCategoryLabel = (cat) => {
  if (!cat) return 'SIGNAL'
  return String(cat).replace(/_/g, ' ')
}

onMounted(loadPatterns)

onUnmounted(() => {
  if (refreshTimer) window.clearTimeout(refreshTimer)
})

watch(
  () => authStore.activeBrand,
  (newBrand, oldBrand) => {
    if (newBrand && newBrand.id !== oldBrand?.id) {
      loadPatterns()
    }
  }
)

watch(
  () => authStore.lastSyncTimestamp,
  () => {
    if (authStore.activeBrand) loadPatterns()
  }
)
</script>