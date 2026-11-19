<template>
  <div class="w-full min-w-0 max-w-5xl mx-auto space-y-6 pb-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border-hairline">
      <div>
        <p class="klx-mono-label text-volt-ink mb-1.5">04 / Brand Constitution</p>
        <h1 class="font-display font-extrabold text-3xl sm:text-4xl tracking-[-0.03em] text-ink leading-none">
          Brand Memory
        </h1>
        <p class="mt-2 text-sm text-ink-secondary">
          Permanent, evidence-backed rules governing every strategy blueprint and script Klarix writes.
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span
          v-if="!loading && memories.length > 0"
          class="klx-badge bg-surface border border-border-strong text-ink py-2 px-3"
        >
          {{ memories.length }} {{ memories.length === 1 ? 'ACTIVE RULE' : 'ACTIVE RULES' }}
        </span>

        <router-link
          to="/patterns"
          class="klx-btn-volt px-4 py-2.5 text-xs font-mono uppercase tracking-wider"
        >
          <Sparkles class="w-3.5 h-3.5" :stroke-width="2" />
          <span>Review Patterns</span>
        </router-link>
      </div>
    </div>

    <!-- Inline Revocation Feedback / Error Banner -->
    <div
      v-if="actionError"
      role="alert"
      class="p-3.5 bg-status-negative-bg border border-status-negative/35 rounded-[2px] flex items-center justify-between gap-3 text-xs font-medium text-status-negative"
    >
      <div class="flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" :stroke-width="2" />
        <span>{{ actionError }}</span>
      </div>
      <button
        type="button"
        @click="actionError = null"
        class="p-1 hover:opacity-75 cursor-pointer"
        aria-label="Dismiss error"
      >
        <X class="w-3.5 h-3.5" :stroke-width="2" />
      </button>
    </div>

    <!-- Domain Filter Bar -->
    <div
      v-if="!loading && memories.length > 0 && domainFilters.length > 2"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <div class="inline-flex flex-wrap gap-1 bg-surface border border-border-strong p-1 rounded-[2px]">
        <button
          v-for="domain in domainFilters"
          :key="domain"
          type="button"
          @click="selectedDomain = domain"
          class="px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider rounded-[2px] transition-colors cursor-pointer"
          :class="
            selectedDomain === domain
              ? 'bg-ink text-surface'
              : 'text-ink-secondary hover:text-ink hover:bg-canvas'
          "
        >
          {{ formatDomainLabel(domain) }}
        </button>
      </div>

      <span class="klx-mono-label text-ink-muted">
        {{ filteredMemories.length }} {{ filteredMemories.length === 1 ? 'RULE SHOWN' : 'RULES SHOWN' }}
      </span>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="klx-card p-6 space-y-3">
        <div class="flex items-center justify-between">
          <div class="klx-skeleton h-5 w-28"></div>
          <div class="klx-skeleton h-8 w-24"></div>
        </div>
        <div class="klx-skeleton h-5 w-full"></div>
        <div class="klx-skeleton h-4 w-2/3"></div>
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
        @click="loadMemories"
        class="mt-4 klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Try Again</span>
      </button>
    </div>

    <!-- Empty Constitution State -->
    <div
      v-else-if="memories.length === 0"
      class="klx-card p-10 sm:p-12 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-canvas border border-border-hairline rounded-[2px] flex items-center justify-center mb-4">
        <Brain class="w-5 h-5 text-ink-muted" :stroke-width="1.75" />
      </div>
      <h2 class="font-display font-bold text-2xl text-ink">Brand Constitution Empty</h2>
      <p class="mt-2 text-sm text-ink-secondary max-w-md leading-relaxed">
        No strategic rules are currently locked. Inspect verified patterns and promote the ones you want governing your future content scripts.
      </p>
      <router-link
        to="/patterns"
        class="mt-6 klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
      >
        <span>Discover Patterns</span>
        <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
      </router-link>
    </div>

    <!-- Grouped Constitution Ledger -->
    <div v-else class="space-y-3">
      <article
        v-for="memory in filteredMemories"
        :key="memory.id"
        class="klx-card p-5 sm:p-6 flex flex-col md:flex-row gap-5 justify-between md:items-start transition-colors"
        :class="confirmingId === memory.id ? 'border-status-negative' : 'hover:border-border-strong'"
      >
        <div class="space-y-3 flex-1 min-w-0">
          <!-- Domain, Provenance & Date Row -->
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="klx-badge bg-canvas border border-border-strong text-ink">
              {{ formatDomainLabel(memory.domain) }}
            </span>

            <span
              v-if="memory.sourceType"
              class="klx-badge bg-volt-tint border border-ink/25 text-ink"
            >
              {{ formatDomainLabel(memory.sourceType) }}
            </span>

            <span class="inline-flex items-center gap-1 font-mono text-[11px] text-ink-muted">
              <Clock class="w-3 h-3" :stroke-width="1.75" />
              <span>Locked {{ formatDate(memory.createdAt) }}</span>
            </span>

            <router-link
              v-if="memory.sourcePatternId"
              :to="`/patterns/${memory.sourcePatternId}`"
              class="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink hover:text-volt-ink underline underline-offset-4"
            >
              <span>View Proof</span>
              <ArrowRight class="w-3 h-3" :stroke-width="2" />
            </router-link>
          </div>

          <!-- Active Strategic Statement -->
          <p class="text-sm sm:text-base font-medium text-ink leading-relaxed pl-3.5 border-l-2 border-volt">
            {{ memory.statement }}
          </p>

          <!-- Optional Confidence Meter (Rendered cleanly whenever backend supplies confidence) -->
          <div
            v-if="memory.confidence != null"
            class="pt-1 flex items-center gap-3 max-w-xs"
          >
            <div class="flex-1 h-1.5 bg-surface-subtle overflow-hidden">
              <div
                class="h-full bg-ink"
                :style="{ width: `${clampConfidence(memory.confidence)}%` }"
              ></div>
            </div>
            <span class="klx-kpi text-[11px] font-semibold text-ink-secondary">
              {{ clampConfidence(memory.confidence).toFixed(0) }}% CONF
            </span>
          </div>
        </div>

        <!-- Two-Step Inline Revoke Governance Control (Zero window.confirm) -->
        <div class="shrink-0 w-full md:w-auto flex md:flex-col items-stretch md:items-end justify-end gap-2">
          <template v-if="confirmingId === memory.id">
            <div class="text-[11px] font-mono text-status-negative md:text-right hidden md:block">
              Remove from AI context?
            </div>
            <div class="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                @click="confirmingId = null"
                :disabled="revokingId === memory.id"
                class="klx-btn-outline px-3 py-2 text-xs font-mono uppercase tracking-wider flex-1 md:flex-none"
              >
                Cancel
              </button>
              <button
                type="button"
                @click="revokeMemory(memory.id)"
                :disabled="revokingId === memory.id"
                class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-status-negative hover:opacity-90 text-white border border-status-negative rounded-[2px] text-xs font-mono font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex-1 md:flex-none transition-opacity"
              >
                <span v-if="revokingId === memory.id" class="klx-pulse-square !bg-white"></span>
                <span>{{ revokingId === memory.id ? 'Revoking...' : 'Confirm Revoke' }}</span>
              </button>
            </div>
          </template>

          <button
            v-else
            type="button"
            @click="confirmingId = memory.id"
            :disabled="Boolean(revokingId)"
            class="klx-btn-outline px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-ink-secondary hover:text-status-negative hover:border-status-negative/60 hover:bg-status-negative-bg/30 w-full md:w-auto"
          >
            <Trash2 class="w-3.5 h-3.5" :stroke-width="1.75" />
            <span>Revoke Rule</span>
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  Brain,
  Sparkles,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Trash2,
  Clock,
  X
} from 'lucide-vue-next'

const authStore = useAuthStore()
const memories = ref([])
const loading = ref(true)
const error = ref(null)
const actionError = ref(null)
const confirmingId = ref(null)
const revokingId = ref(null)
const selectedDomain = ref('ALL')

const domainFilters = computed(() => {
  const unique = new Set(memories.value.map((m) => m.domain).filter(Boolean))
  return ['ALL', ...Array.from(unique)]
})

const filteredMemories = computed(() => {
  if (selectedDomain.value === 'ALL') return memories.value
  return memories.value.filter((m) => m.domain === selectedDomain.value)
})

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
  } catch (e) {
    console.error('Failed to fetch brand context', e)
  }
  return false
}

const loadMemories = async () => {
  loading.value = true
  error.value = null
  actionError.value = null
  confirmingId.value = null

  const hasBrand = await ensureActiveBrand()
  if (!hasBrand) {
    error.value = 'Active brand workspace not found.'
    loading.value = false
    return
  }

  try {
    const response = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/memory`, {
      credentials: 'include'
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.error?.message || payload.message || 'Failed to fetch brand memory.')
    }

    memories.value = payload.data?.memories || []
    if (
      selectedDomain.value !== 'ALL' &&
      !memories.value.some((m) => m.domain === selectedDomain.value)
    ) {
      selectedDomain.value = 'ALL'
    }
  } catch (err) {
    error.value = err.message || 'Failed to load Brand Memory.'
  } finally {
    loading.value = false
  }
}

const revokeMemory = async (memoryId) => {
  revokingId.value = memoryId
  actionError.value = null

  try {
    const response = await fetch(
      `/api/v2/brands/${authStore.activeBrand.id}/memory/${memoryId}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error?.message || payload.message || 'Failed to revoke memory rule.')
    }

    memories.value = memories.value.filter((m) => m.id !== memoryId)
    confirmingId.value = null
  } catch (err) {
    actionError.value = err.message || 'Unable to revoke rule.'
  } finally {
    revokingId.value = null
  }
}

const clampConfidence = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, num <= 1 && num > 0 ? num * 100 : num))
}

const formatDomainLabel = (domain) => (domain ? String(domain).replace(/_/g, ' ') : 'GENERAL')

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown Date'
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(loadMemories)

watch(
  () => authStore.activeBrand,
  (newBrand, oldBrand) => {
    if (newBrand && newBrand.id !== oldBrand?.id) {
      loadMemories()
    }
  }
)
</script>