<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-6 pb-12">
    <!-- Top Header & Navigation -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border-hairline">
      <div>
        <router-link
          to="/strategy"
          class="inline-flex items-center gap-1.5 klx-mono-label text-ink-muted hover:text-ink transition-colors mb-2.5"
        >
          <ArrowLeft class="w-3.5 h-3.5" :stroke-width="2" />
          <span>Back to Strategy Blueprint</span>
        </router-link>
        <h1 class="font-display font-extrabold text-3xl sm:text-4xl tracking-[-0.03em] text-ink leading-none">
          Ideation Board
        </h1>
        <p class="mt-2 text-sm text-ink-secondary">
          Review draft concepts anchored in your Brand Memory before writing full production scripts.
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span
          v-if="!loading"
          class="klx-badge border py-2 px-3"
          :class="
            ideas.length > 0
              ? 'bg-surface border-border-strong text-ink'
              : 'bg-status-positive-bg border-status-positive/30 text-status-positive'
          "
        >
          {{ ideas.length > 0 ? `${ideas.length} DRAFT ${ideas.length === 1 ? 'CONCEPT' : 'CONCEPTS'}` : 'INBOX ZERO' }}
        </span>
      </div>
    </div>

    <!-- Active Replacement Job Banner -->
    <div
      v-if="jobMessage"
      role="status"
      class="p-4 border rounded-[2px] flex items-center gap-3 text-xs font-medium"
      :class="
        jobState === 'RETRY_PENDING'
          ? 'bg-status-warning-bg border-status-warning/40 text-status-warning'
          : 'bg-volt-tint border-ink text-ink'
      "
    >
      <span
        class="klx-pulse-square shrink-0"
        :class="jobState === 'RETRY_PENDING' ? '!bg-status-warning' : '!bg-ink'"
      ></span>
      <span>{{ jobMessage }}</span>
    </div>

    <!-- Loading Skeleton Grid -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div v-for="i in 3" :key="i" class="klx-card p-6 space-y-4">
        <div class="flex justify-between">
          <div class="klx-skeleton h-5 w-20"></div>
          <div class="klx-skeleton h-4 w-14"></div>
        </div>
        <div class="klx-skeleton h-6 w-5/6"></div>
        <div class="klx-skeleton h-20 w-full"></div>
        <div class="klx-skeleton h-16 w-full"></div>
        <div class="pt-4 border-t border-border-hairline grid grid-cols-2 gap-3">
          <div class="klx-skeleton h-9"></div>
          <div class="klx-skeleton h-9"></div>
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
      <p class="text-sm font-semibold text-status-negative">{{ error }}</p>
      <button
        type="button"
        @click="loadIdeas"
        class="mt-4 klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Try Again</span>
      </button>
    </div>

    <!-- Empty Inbox Zero State -->
    <div
      v-else-if="ideas.length === 0"
      class="klx-card p-10 sm:p-14 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-status-positive-bg border border-status-positive/35 rounded-[2px] flex items-center justify-center mb-4">
        <CheckCircle2 class="w-5 h-5 text-status-positive" :stroke-width="2" />
      </div>
      <h2 class="font-display font-bold text-2xl text-ink">All Caught Up</h2>
      <p class="mt-2 text-sm text-ink-secondary max-w-md leading-relaxed">
        Every draft concept in this strategy has been published or processed. Return to your Strategy Blueprint to generate a fresh batch.
      </p>
      <router-link
        to="/strategy"
        class="mt-6 klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
      >
        <span>Return to Strategy</span>
        <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
      </router-link>
    </div>

    <!-- 3-Column Ideation Board -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <article
        v-for="idea in ideas"
        :key="idea.id"
        class="klx-card klx-card-interactive flex flex-col overflow-hidden"
      >
        <!-- Card Header -->
        <div class="p-5 bg-canvas border-b border-border-hairline space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="klx-badge bg-ink text-volt">
              {{ idea.format }}
            </span>
            <span class="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {{ idea.status }}
            </span>
          </div>

          <h2 class="font-display font-bold text-lg text-ink leading-snug tracking-tight">
            {{ idea.title }}
          </h2>

          <div class="font-mono text-[11px] text-ink-muted">
            Pillar: <span class="text-ink font-medium">{{ idea.pillar }}</span>
          </div>
        </div>

        <!-- Card Body (Proposed Hook & Rationale) -->
        <div class="p-5 flex-1 bg-surface space-y-5">
          <div>
            <div class="klx-mono-label text-ink-muted mb-1.5">Proposed Hook</div>
            <p class="text-sm font-medium text-ink leading-relaxed pl-3 border-l-2 border-volt">
              “{{ idea.hook }}”
            </p>
          </div>

          <div>
            <div class="klx-mono-label text-ink-muted mb-1.5">Strategic Rationale</div>
            <p class="text-xs text-ink-secondary leading-relaxed">
              {{ idea.rationale }}
            </p>
          </div>
        </div>

        <!-- Card Control Gates -->
        <div class="p-4 bg-canvas border-t border-border-hairline flex items-center gap-2.5">
          <button
            type="button"
            @click="discardIdea(idea.id)"
            :disabled="generatingIdea"
            class="klx-btn-outline px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider text-ink-secondary hover:text-status-negative hover:border-status-negative/60 flex-1 bg-surface"
          >
            <RotateCcw class="w-3 h-3" :stroke-width="2" />
            <span>Replace</span>
          </button>

          <router-link
            :to="`/strategy/${strategyId}/ideas/${idea.id}/script`"
            class="klx-btn-volt px-3.5 py-2.5 text-[11px] font-mono uppercase tracking-wider flex-1"
          >
            <span>Write Script</span>
            <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
          </router-link>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { strategyApi } from '../services/strategyApi'
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw
} from 'lucide-vue-next'

const route = useRoute()
const authStore = useAuthStore()
const strategyId = route.params.strategyId

const ideas = ref([])
const loading = ref(true)
const error = ref(null)

const generatingIdea = ref(false)
const jobMessage = ref('')
const jobState = ref(null)
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

const loadIdeas = async () => {
  loading.value = true
  error.value = null

  const hasBrand = await ensureActiveBrand()
  if (!hasBrand) {
    loading.value = false
    return
  }

  try {
    const response = await strategyApi.getIdeas(authStore.activeBrand.id, strategyId)
    ideas.value = (response.data?.ideas || []).filter((idea) => idea.status === 'DRAFT')
  } catch (err) {
    error.value = err.message || 'Failed to load content ideas.'
  } finally {
    loading.value = false
  }
}

const discardIdea = async (ideaId) => {
  const hasBrand = await ensureActiveBrand()
  if (!hasBrand) return

  ideas.value = ideas.value.filter((i) => i.id !== ideaId)
  generatingIdea.value = true
  jobState.value = 'QUEUED'
  jobMessage.value = 'Discarding concept and generating a targeted replacement...'
  error.value = null

  try {
    await strategyApi.deleteIdea(ideaId)
    const res = await strategyApi.generateIdeas(authStore.activeBrand.id, strategyId, 1)
    const jobId = res.data.job.id
    pollReplacementJob(jobId)
  } catch (err) {
    error.value = err.message || 'Failed to discard and replace idea.'
    generatingIdea.value = false
    jobMessage.value = ''
    jobState.value = null
    loadIdeas()
  }
}

const pollReplacementJob = (jobId) => {
  stopPolling()

  pollInterval = setInterval(async () => {
    try {
      const res = await strategyApi.getJobStatus(authStore.activeBrand.id, jobId)
      const job = res.data.job

      jobState.value = job.state
      if (job.state === 'RETRY_PENDING') {
        jobMessage.value = 'High AI demand — automatically retrying replacement idea in ~30s...'
      }

      if (job.state === 'COMPLETED') {
        stopPolling()
        jobMessage.value = ''
        jobState.value = null
        generatingIdea.value = false

        const updatedResponse = await strategyApi.getIdeas(authStore.activeBrand.id, strategyId)
        ideas.value = (updatedResponse.data?.ideas || []).filter((idea) => idea.status === 'DRAFT')
      } else if (job.state === 'FAILED' || job.state === 'CANCELLED') {
        stopPolling()
        jobMessage.value = ''
        jobState.value = null
        generatingIdea.value = false
        error.value = job.error?.message || 'AI failed to generate a replacement idea.'
      }
    } catch (err) {
      console.error('Polling error', err)
    }
  }, 2000)
}

onMounted(loadIdeas)
onUnmounted(stopPolling)
</script>