<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-6 pb-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border-hairline">
      <div>
        <p class="klx-mono-label text-volt-ink mb-1.5">05 / Strategy Blueprint</p>
        <h1 class="font-display font-extrabold text-3xl sm:text-4xl tracking-[-0.03em] text-ink leading-none">
          Brand Strategy
        </h1>
        <p class="mt-2 text-sm text-ink-secondary">
          Your evidence-backed positioning, content pillars, and creative guardrails.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 shrink-0">
        <router-link
          v-if="strategy"
          :to="`/strategy/${strategy.id}/ideas`"
          class="klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
        >
          <span>Ideation Board</span>
          <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
        </router-link>

        <button
          type="button"
          :class="
            strategy
              ? 'klx-btn-outline px-4 py-2.5 text-xs font-mono uppercase tracking-wider bg-surface'
              : 'klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider'
          "
          :disabled="generating || loading || !authStore.activeBrand"
          @click="generateStrategy"
        >
          <span v-if="generating" class="klx-pulse-square !bg-ink"></span>
          <Sparkles v-else class="w-3.5 h-3.5" :stroke-width="2" />
          <span>{{ generating ? 'Generating...' : strategy ? 'Regenerate Strategy' : 'Generate Strategy' }}</span>
        </button>
      </div>
    </div>

    <!-- Active Job Polling Status -->
    <div
      v-if="jobMessage"
      role="status"
      class="p-4 border rounded-[2px] flex items-center justify-between gap-4 text-xs font-medium"
      :class="
        jobState === 'RETRY_PENDING'
          ? 'bg-status-warning-bg border-status-warning/40 text-status-warning'
          : 'bg-volt-tint border-ink text-ink'
      "
    >
      <div class="flex items-center gap-2.5">
        <span
          class="klx-pulse-square shrink-0"
          :class="jobState === 'RETRY_PENDING' ? '!bg-status-warning' : '!bg-ink'"
        ></span>
        <span>{{ jobMessage }}</span>
      </div>
      <span v-if="jobProgress > 0" class="klx-kpi font-bold shrink-0">{{ jobProgress }}%</span>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-6">
      <div class="klx-card p-6 sm:p-8 space-y-5">
        <div class="klx-skeleton h-3 w-32"></div>
        <div class="klx-skeleton h-7 w-3/4"></div>
        <div class="grid md:grid-cols-2 gap-6 pt-5 border-t border-border-hairline">
          <div class="klx-skeleton h-20 w-full"></div>
          <div class="klx-skeleton h-20 w-full"></div>
        </div>
      </div>
      <div class="grid md:grid-cols-2 gap-5">
        <div class="klx-card p-6 h-56 klx-skeleton"></div>
        <div class="klx-card p-6 h-56 klx-skeleton"></div>
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
      <h2 class="font-display font-bold text-lg text-status-negative">Failed to load strategy</h2>
      <p class="mt-1 text-sm text-status-negative/90 max-w-md">{{ error }}</p>
      <button
        type="button"
        @click="loadStrategy"
        class="mt-5 klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Retry</span>
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!strategy"
      class="klx-card p-10 sm:p-14 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-canvas border border-border-hairline rounded-[2px] flex items-center justify-center mb-4">
        <Compass class="w-5 h-5 text-ink-muted" :stroke-width="1.75" />
      </div>
      <h2 class="font-display font-bold text-2xl text-ink">No Active Strategy Blueprint</h2>
      <p class="mt-2 text-sm text-ink-secondary max-w-md leading-relaxed">
        Synthesize your analytics baselines and locked Brand Memory into an actionable content strategy and shoot queue.
      </p>
      <button
        type="button"
        @click="generateStrategy"
        :disabled="generating || !authStore.activeBrand"
        class="mt-6 klx-btn-volt px-6 py-3 text-xs font-mono uppercase tracking-wider"
      >
        <Sparkles class="w-3.5 h-3.5" :stroke-width="2" />
        <span>{{ generating ? 'Generating...' : 'Generate Strategy Blueprint' }}</span>
      </button>
    </div>

    <!-- Active Strategy Blueprint -->
    <div v-else class="space-y-6">
      <!-- Version Metadata Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span class="klx-badge bg-ink text-volt">
            VERSION {{ strategy.version || 1 }}
          </span>
          <span class="klx-mono-label text-ink-muted">ACTIVE BLUEPRINT</span>
        </div>

        <router-link
          :to="`/strategy/${strategy.id}/ideas`"
          class="inline-flex items-center gap-1.5 klx-mono-label text-ink hover:text-volt-ink transition-colors"
        >
          <span>Open Content Ideas Queue</span>
          <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
        </router-link>
      </div>

      <!-- Core Objective, Target Audience & Positioning -->
      <section class="klx-card p-6 sm:p-8 space-y-6">
        <div class="pl-4 border-l-2 border-volt">
          <div class="klx-mono-label text-ink-muted mb-1.5">Core Objective</div>
          <p class="font-display font-bold text-xl sm:text-2xl text-ink leading-snug tracking-tight">
            {{ strategy.objective }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border-hairline">
          <div class="space-y-1.5">
            <div class="klx-mono-label text-ink-muted">Target Audience</div>
            <p class="text-sm text-ink-secondary leading-relaxed">
              {{ strategy.targetAudience }}
            </p>
          </div>
          <div class="space-y-1.5">
            <div class="klx-mono-label text-ink-muted">Market Positioning</div>
            <p class="text-sm text-ink-secondary leading-relaxed">
              {{ strategy.positioning }}
            </p>
          </div>
        </div>
      </section>

      <!-- Content Pillars & Recommended Formats -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Content Pillars -->
        <div class="klx-card p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-border-hairline">
            <h2 class="klx-mono-label text-ink">Content Pillars</h2>
            <span class="font-mono text-[10px] text-ink-muted">
              {{ strategy.pillars?.length || 0 }} PILLARS
            </span>
          </div>

          <ul class="space-y-3.5">
            <li
              v-for="(pillar, idx) in strategy.pillars"
              :key="idx"
              class="p-3.5 bg-canvas border border-border-hairline rounded-[2px] flex items-start gap-3"
            >
              <span class="font-mono text-[10px] font-bold text-ink bg-volt border border-ink px-1.5 py-0.5 rounded-[2px] shrink-0 mt-0.5">
                0{{ idx + 1 }}
              </span>
              <div v-if="parseJsonItem(pillar).name" class="min-w-0">
                <strong class="text-sm font-semibold text-ink block">
                  {{ parseJsonItem(pillar).name }}
                </strong>
                <span
                  v-if="parseJsonItem(pillar).description || parseJsonItem(pillar).rationale"
                  class="text-xs text-ink-secondary leading-relaxed mt-1 block"
                >
                  {{ parseJsonItem(pillar).description || parseJsonItem(pillar).rationale }}
                </span>
              </div>
              <span v-else class="text-sm text-ink">{{ pillar }}</span>
            </li>
          </ul>
        </div>

        <!-- Recommended Formats -->
        <div class="klx-card p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-border-hairline">
            <h2 class="klx-mono-label text-ink">Recommended Formats</h2>
            <span class="font-mono text-[10px] text-ink-muted">
              {{ strategy.recommendedFormats?.length || 0 }} FORMATS
            </span>
          </div>

          <div class="space-y-3">
            <div
              v-for="(format, idx) in strategy.recommendedFormats"
              :key="idx"
              class="p-4 bg-canvas border border-border-hairline rounded-[2px]"
            >
              <template v-if="parseJsonItem(format).format">
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <strong class="font-display font-bold text-base text-ink">
                    {{ parseJsonItem(format).format }}
                  </strong>
                  <span
                    v-if="parseJsonItem(format).frequency"
                    class="klx-badge bg-surface border border-border-hairline text-ink-secondary"
                  >
                    {{ parseJsonItem(format).frequency }}
                  </span>
                </div>
                <p class="text-xs text-ink-secondary leading-relaxed">
                  {{ parseJsonItem(format).description || parseJsonItem(format).rationale }}
                </p>
              </template>
              <span v-else class="text-sm text-ink">{{ format }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Creative Guardrails (Do / Stop) -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- The "Do" List -->
        <div class="klx-card p-6 border-t-2 border-t-status-positive space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="klx-mono-label text-status-positive">The "Do" List</h2>
            <CheckCircle2 class="w-4 h-4 text-status-positive" :stroke-width="2" />
          </div>
          <ul class="space-y-2.5">
            <li
              v-for="(item, idx) in strategy.doList"
              :key="idx"
              class="flex items-start gap-2.5 text-sm text-ink leading-relaxed"
            >
              <Check class="w-4 h-4 text-status-positive shrink-0 mt-0.5" :stroke-width="2.25" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <!-- The "Stop" List -->
        <div class="klx-card p-6 border-t-2 border-t-status-negative space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="klx-mono-label text-status-negative">The "Stop" List</h2>
            <XCircle class="w-4 h-4 text-status-negative" :stroke-width="2" />
          </div>
          <ul class="space-y-2.5">
            <li
              v-for="(item, idx) in strategy.stopList"
              :key="idx"
              class="flex items-start gap-2.5 text-sm text-ink leading-relaxed"
            >
              <X class="w-4 h-4 text-status-negative shrink-0 mt-0.5" :stroke-width="2.25" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Optional V2 Experiments & Success Metrics (Shown whenever returned by backend) -->
      <section
        v-if="(strategy.experiments && strategy.experiments.length) || (strategy.successMetrics && strategy.successMetrics.length)"
        class="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        <div v-if="strategy.experiments?.length" class="klx-card p-6 space-y-4">
          <div class="klx-mono-label text-ink pb-3 border-b border-border-hairline">
            Active Experiments
          </div>
          <ul class="space-y-3">
            <li
              v-for="(exp, idx) in strategy.experiments"
              :key="idx"
              class="p-3.5 bg-canvas border border-border-hairline rounded-[2px] text-sm text-ink"
            >
              <template v-if="parseJsonItem(exp).name || parseJsonItem(exp).hypothesis">
                <strong class="block font-semibold text-ink">
                  {{ parseJsonItem(exp).name || parseJsonItem(exp).hypothesis }}
                </strong>
                <span
                  v-if="parseJsonItem(exp).description || parseJsonItem(exp).metric"
                  class="text-xs text-ink-secondary mt-1 block leading-relaxed"
                >
                  {{ parseJsonItem(exp).description || parseJsonItem(exp).metric }}
                </span>
              </template>
              <span v-else>{{ exp }}</span>
            </li>
          </ul>
        </div>

        <div v-if="strategy.successMetrics?.length" class="klx-card p-6 space-y-4">
          <div class="klx-mono-label text-ink pb-3 border-b border-border-hairline">
            Success Metrics
          </div>
          <ul class="space-y-2.5">
            <li
              v-for="(metric, idx) in strategy.successMetrics"
              :key="idx"
              class="p-3 bg-canvas border border-border-hairline rounded-[2px] flex items-start gap-2.5 text-sm text-ink"
            >
              <span class="w-2 h-2 bg-volt border border-ink shrink-0 mt-1.5"></span>
              <span>
                {{
                  parseJsonItem(metric).metric ||
                  parseJsonItem(metric).name ||
                  metric
                }}
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { strategyApi } from '../services/strategyApi'
import {
  Compass,
  Sparkles,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Check,
  CheckCircle2,
  X,
  XCircle
} from 'lucide-vue-next'

const authStore = useAuthStore()
const strategy = ref(null)
const loading = ref(true)
const generating = ref(false)
const error = ref(null)
const jobMessage = ref('')
const jobState = ref(null)
const jobProgress = ref(0)
let pollInterval = null

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

const ensureActiveBrand = async () => {
  if (authStore.activeBrand) return true
  try {
    const res = await fetch('/api/v2/brands', { credentials: 'include' })
    const { data } = await res.json()
    if (data?.brands?.length > 0) {
      authStore.setActiveBrand(data.brands[0])
      return true
    }
  } catch (e) {
    console.error('Failed to fetch brand context', e)
  }
  return false
}

const parseJsonItem = (item) => {
  if (!item) return {}
  if (typeof item === 'object') return item
  try {
    const str = String(item).trim()
    return str.startsWith('{') ? JSON.parse(str) : { name: str }
  } catch {
    return { name: String(item) }
  }
}

const loadStrategy = async () => {
  loading.value = true
  error.value = null

  const hasBrand = await ensureActiveBrand()
  if (!hasBrand) {
    loading.value = false
    return
  }

  try {
    const response = await strategyApi.getActiveStrategy(authStore.activeBrand.id)
    strategy.value = response.data.strategy
  } catch (err) {
    if (err.message && err.message.includes('No strategy found')) {
      strategy.value = null
    } else {
      error.value = err.message || 'Failed to load strategy.'
    }
  } finally {
    loading.value = false
  }
}

const generateStrategy = async () => {
  const hasBrand = await ensureActiveBrand()
  if (!hasBrand) return

  generating.value = true
  error.value = null
  jobState.value = 'QUEUED'
  jobProgress.value = 0
  jobMessage.value = 'Initializing AI Strategy Engine...'

  try {
    const res = await strategyApi.generateStrategy(authStore.activeBrand.id)
    const jobId = res.data.job.id
    pollJob(jobId)
  } catch (err) {
    error.value = err.message || 'Failed to trigger strategy generation.'
    generating.value = false
    jobMessage.value = ''
    jobState.value = null
  }
}

const pollJob = (jobId) => {
  stopPolling()

  pollInterval = setInterval(async () => {
    try {
      const res = await strategyApi.getJobStatus(authStore.activeBrand.id, jobId)
      const job = res.data.job

      jobState.value = job.state
      jobProgress.value = job.progressPercent || 0

      if (job.state === 'RETRY_PENDING') {
        jobMessage.value = 'High AI demand — automatically retrying strategy synthesis in ~30s...'
      } else {
        jobMessage.value = `Processing: ${job.progressStep || 'Synthesizing blueprint...'}`
      }

      if (job.state === 'COMPLETED') {
        stopPolling()
        jobMessage.value = ''
        jobState.value = null
        jobProgress.value = 0
        generating.value = false
        await loadStrategy()
      } else if (job.state === 'FAILED' || job.state === 'CANCELLED') {
        stopPolling()
        error.value = job.error?.message || 'Strategy generation failed. Please try again.'
        generating.value = false
        jobMessage.value = ''
        jobState.value = null
      }
    } catch (err) {
      console.error('Polling error', err)
    }
  }, 2000)
}

onMounted(loadStrategy)
onUnmounted(stopPolling)

watch(
  () => authStore.activeBrand,
  (newBrand, oldBrand) => {
    if (newBrand && newBrand.id !== oldBrand?.id) {
      loadStrategy()
    }
  }
)
</script>