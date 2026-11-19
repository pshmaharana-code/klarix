<template>
  <div class="p-6 bg-canvas border border-border-hairline rounded-[2px] space-y-5">
    <!-- Top Status Row -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="klx-mono-label text-ink-muted">Ingestion Worker</div>
        <h3 class="mt-1 font-display font-bold text-lg text-ink">
          Synchronizing Instagram Telemetry
        </h3>
      </div>

      <span class="klx-badge border" :class="stateBadgeClass">
        <span
          v-if="!['COMPLETED', 'FAILED', 'CANCELLED'].includes(jobState)"
          class="klx-pulse-square"
          :class="jobState === 'RETRY_PENDING' ? '!bg-status-warning' : '!bg-ink'"
        ></span>
        <span>{{ jobState }}</span>
      </span>
    </div>

    <!-- Sharp Mechanical Progress Bar -->
    <div class="space-y-2">
      <div class="w-full h-2 bg-surface-subtle border border-border-hairline overflow-hidden rounded-[1px]">
        <div
          class="h-full transition-all duration-500 ease-out"
          :class="progressBarClass"
          :style="{ width: `${Math.max(4, progressPercent)}%` }"
        ></div>
      </div>

      <div class="flex items-center justify-between text-xs font-mono">
        <span class="text-ink-secondary font-medium">
          {{
            jobState === 'RETRY_PENDING'
              ? 'High AI demand — automatically retrying shortly...'
              : progressStep || 'Initializing connection...'
          }}
        </span>
        <span class="klx-kpi font-bold text-ink">{{ progressPercent }}%</span>
      </div>

      <p v-if="progressMessage && jobState !== 'RETRY_PENDING'" class="text-xs text-ink-muted">
        {{ progressMessage }}
      </p>
    </div>

    <!-- Rate-Limit Backoff Calm Notice -->
    <div
      v-if="jobState === 'RETRY_PENDING'"
      class="p-4 bg-status-warning-bg border border-status-warning/35 rounded-[2px] flex items-start gap-2.5 text-xs text-status-warning"
    >
      <Clock class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
      <span>
        Your job is safely queued during a temporary rate-limit window and will resume automatically without losing progress.
      </span>
    </div>

    <!-- Error Display -->
    <div
      v-if="jobState === 'FAILED' || jobState === 'CANCELLED'"
      role="alert"
      class="p-4 bg-status-negative-bg border border-status-negative/35 rounded-[2px] space-y-3"
    >
      <div class="flex items-start gap-2.5 text-sm text-status-negative font-medium">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
        <span>{{ errorMessage || 'An unexpected error occurred during connection.' }}</span>
      </div>

      <button
        type="button"
        @click="$emit('retry')"
        class="klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        <RotateCcw class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Retry Connection</span>
      </button>
    </div>

    <!-- Success Display -->
    <div
      v-if="jobState === 'COMPLETED'"
      role="status"
      class="p-4 bg-status-positive-bg border border-status-positive/35 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div class="flex items-start gap-2.5 text-sm text-status-positive font-medium">
        <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
        <span>
          Successfully linked Instagram account
          <strong v-if="resultData?.username" class="font-mono">@{{ resultData.username }}</strong>.
        </span>
      </div>

      <button
        type="button"
        @click="$emit('continue')"
        class="klx-btn-volt px-4 py-2.5 text-xs font-mono uppercase tracking-wider shrink-0"
      >
        <span>Open Command Center</span>
        <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  ArrowRight,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-vue-next'

const props = defineProps({
  jobId: { type: String, required: true },
  brandId: { type: String, required: true }
})

const emit = defineEmits(['retry', 'continue', 'status-change'])

const jobState = ref('QUEUED')
const progressPercent = ref(0)
const progressStep = ref('')
const progressMessage = ref('')
const errorMessage = ref(null)
const resultData = ref(null)

let pollInterval = null

const stateBadgeClass = computed(() => {
  if (jobState.value === 'COMPLETED') {
    return 'bg-status-positive-bg border-status-positive/35 text-status-positive'
  }
  if (jobState.value === 'FAILED' || jobState.value === 'CANCELLED') {
    return 'bg-status-negative-bg border-status-negative/35 text-status-negative'
  }
  if (jobState.value === 'RETRY_PENDING') {
    return 'bg-status-warning-bg border-status-warning/40 text-status-warning'
  }
  if (jobState.value === 'PROCESSING') {
    return 'bg-volt border-ink text-ink'
  }
  return 'bg-surface border-border-hairline text-ink-secondary'
})

const progressBarClass = computed(() => {
  if (jobState.value === 'COMPLETED') return 'bg-status-positive'
  if (jobState.value === 'FAILED' || jobState.value === 'CANCELLED') return 'bg-status-negative'
  if (jobState.value === 'RETRY_PENDING') return 'bg-status-warning'
  return 'bg-ink'
})

const fetchJobStatus = async () => {
  try {
    const response = await fetch(`/api/v2/brands/${props.brandId}/jobs/${props.jobId}`, {
      credentials: 'include'
    })
    if (!response.ok) throw new Error(`Job status request failed (${response.status})`)
    const data = await response.json()

    if (data.success && data.data?.job) {
      const job = data.data.job
      jobState.value = job.state
      progressPercent.value = job.progressPercent || 0
      progressStep.value = job.progressStep || ''
      progressMessage.value = job.progressMessage || ''

      emit('status-change', {
        state: job.state,
        progress: job.progressPercent || 0
      })

      if (job.state === 'COMPLETED') {
        resultData.value = job.result
        stopPolling()
      } else if (job.state === 'FAILED' || job.state === 'CANCELLED') {
        errorMessage.value = job.error?.message || job.error?.code || 'Failed processing job'
        stopPolling()
      }
    }
  } catch (err) {
    console.error('Error polling job:', err)
  }
}

const startPolling = () => {
  fetchJobStatus()
  pollInterval = setInterval(fetchJobStatus, 2000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>