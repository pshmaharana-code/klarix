<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-6 pb-12">
    <!-- ===================================================================
         INITIAL LOADING SKELETON (Matches Command Center Layout)
         =================================================================== -->
    <div v-if="loading" class="space-y-6">
      <div class="flex items-end justify-between pb-5 border-b border-border-hairline">
        <div class="space-y-2.5">
          <div class="klx-skeleton h-3 w-28"></div>
          <div class="klx-skeleton h-8 w-56"></div>
        </div>
        <div class="klx-skeleton h-9 w-40"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="n in 3" :key="n" class="klx-card p-6 space-y-4">
          <div class="klx-skeleton h-3 w-24"></div>
          <div class="klx-skeleton h-9 w-32"></div>
          <div class="klx-skeleton h-4 w-full"></div>
        </div>
      </div>

      <div class="klx-card p-6 space-y-4">
        <div class="klx-skeleton h-4 w-44"></div>
        <div class="klx-skeleton h-16 w-full"></div>
      </div>
    </div>

    <!-- ===================================================================
         NO BRAND INITIALIZED — ONBOARDING SETUP
         =================================================================== -->
    <div v-else-if="!authStore.activeBrand" class="max-w-xl mx-auto py-8 sm:py-12">
      <div class="klx-card p-6 sm:p-10">
        <div class="w-12 h-12 bg-volt border border-ink rounded-[2px] flex items-center justify-center mb-6">
          <Layers class="w-5 h-5 text-ink" :stroke-width="2" />
        </div>

        <p class="klx-mono-label text-volt-ink mb-2">00 / Workspace Setup</p>
        <h1 class="font-display font-extrabold text-3xl tracking-tight text-ink">
          Initialize your brand entity
        </h1>
        <p class="mt-2 text-sm text-ink-secondary leading-relaxed">
          Create your brand record to begin ingesting Instagram telemetry, extracting verified patterns, and locking Brand Memory.
        </p>

        <div
          v-if="brandError"
          role="alert"
          class="mt-5 p-3.5 bg-status-negative-bg border border-status-negative/35 rounded-[2px] flex items-start gap-2.5 text-sm text-status-negative font-medium"
        >
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
          <span>{{ brandError }}</span>
        </div>

        <form @submit.prevent="createBrand" class="mt-7 space-y-5">
          <div>
            <label for="brand-name" class="block klx-mono-label text-ink-secondary mb-1.5">
              Brand Entity Name
            </label>
            <input
              id="brand-name"
              v-model="newBrand.name"
              type="text"
              placeholder="e.g. Klarix Intelligence"
              class="klx-input px-3.5 py-3 text-sm font-medium placeholder:text-ink-muted/70"
              required
            />
          </div>

          <div>
            <label for="brand-positioning" class="block klx-mono-label text-ink-secondary mb-1.5">
              Market Positioning
            </label>
            <input
              id="brand-positioning"
              v-model="newBrand.positioning"
              type="text"
              placeholder="e.g. Content intelligence engine for solo founders"
              class="klx-input px-3.5 py-3 text-sm font-medium placeholder:text-ink-muted/70"
            />
          </div>

          <button
            type="submit"
            :disabled="creating"
            class="klx-btn-volt w-full py-3.5 text-sm font-semibold"
          >
            <span v-if="creating" class="klx-pulse-square !bg-ink"></span>
            <span>{{ creating ? 'Provisioning Brand...' : 'Create Brand Entity' }}</span>
            <ArrowRight v-if="!creating" class="w-4 h-4" :stroke-width="2" />
          </button>
        </form>
      </div>
    </div>

    <!-- ===================================================================
         ACTIVE COMMAND CENTER
         =================================================================== -->
    <div v-else class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-border-hairline">
        <div>
          <p class="klx-mono-label text-volt-ink mb-1.5">00 / Command Center</p>
          <h1 class="font-display font-extrabold text-3xl sm:text-4xl tracking-[-0.03em] text-ink leading-none">
            {{ authStore.activeBrand.name }}
          </h1>
          <p v-if="authStore.activeBrand.positioning" class="mt-2 text-sm text-ink-secondary">
            {{ authStore.activeBrand.positioning }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 shrink-0">
          <router-link
            v-if="authStore.activeBrand.onboardingStatus === 'PENDING' || !authStore.activeBrand.socialAccounts?.length"
            to="/onboarding/connect"
            class="klx-btn-volt px-4 py-2.5 text-xs font-mono uppercase tracking-wider"
          >
            <Link2 class="w-3.5 h-3.5" :stroke-width="2" />
            <span>Connect Instagram</span>
            <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
          </router-link>

          <router-link
            v-else
            to="/strategy"
            class="klx-btn-volt px-4 py-2.5 text-xs font-mono uppercase tracking-wider"
          >
            <span>Open Strategy</span>
            <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
          </router-link>
        </div>
      </div>

      <!-- PIPELINE STATUS BAR -->
      <div class="klx-card p-3 sm:p-4">
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <router-link
            v-for="stage in pipelineStatus"
            :key="stage.step"
            :to="stage.to"
            class="px-3 py-2.5 rounded-[2px] border transition-colors flex flex-col justify-between gap-1.5"
            :class="
              stage.complete
                ? 'bg-canvas border-border-hairline hover:border-border-strong'
                : 'bg-surface border-border-hairline hover:border-border-strong'
            "
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {{ stage.step }}
              </span>
              <span
                class="w-2 h-2"
                :class="stage.complete ? 'bg-volt border border-ink' : 'bg-border-hairline'"
              ></span>
            </div>
            <div class="text-xs font-semibold text-ink truncate">
              {{ stage.label }}
            </div>
          </router-link>
        </div>
      </div>

      <!-- SECTION 1: 3-CARD EXECUTIVE TELEMETRY STRIP -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Card 1: Macro Velocity Verdict -->
        <div class="klx-card klx-card-interactive p-6 flex flex-col justify-between gap-5">
          <div v-if="loadingData" class="space-y-3">
            <div class="klx-skeleton h-3 w-32"></div>
            <div class="klx-skeleton h-8 w-40"></div>
            <div class="klx-skeleton h-4 w-full"></div>
          </div>

          <div v-else>
            <div class="flex items-center justify-between gap-2 mb-4">
              <span class="klx-mono-label text-ink-muted">Macro Velocity</span>
              <span
                v-if="analyticsOverview?.comparisons?.interactionRateTrend != null"
                class="klx-badge border"
                :class="getDeltaBadgeClass(analyticsOverview.comparisons.growth)"
              >
                <TrendingUp
                  v-if="analyticsOverview.comparisons.growth === 'POSITIVE'"
                  class="w-3 h-3"
                  :stroke-width="2.25"
                />
                <TrendingDown
                  v-else-if="analyticsOverview.comparisons.growth === 'NEGATIVE'"
                  class="w-3 h-3"
                  :stroke-width="2.25"
                />
                <Minus v-else class="w-3 h-3" :stroke-width="2.25" />
                <span>{{ formatTrend(analyticsOverview.comparisons.interactionRateTrend) }}</span>
              </span>
            </div>

            <div
              class="font-display font-extrabold text-2xl sm:text-3xl tracking-tight uppercase"
              :class="getVerdictColor(analyticsOverview?.comparisons?.growth)"
            >
              {{ analyticsOverview?.comparisons?.growth || 'Awaiting Data' }}
            </div>

            <p class="mt-2.5 text-xs leading-relaxed text-ink-secondary">
              <template v-if="analyticsOverview?.comparisons?.growth">
                Interaction rate is trending
                <strong class="text-ink klx-kpi">{{ formatTrend(analyticsOverview.comparisons.interactionRateTrend) }}</strong>
                against your historical account baseline.
              </template>
              <template v-else>
                Sync your Instagram catalogue to compute empirical interaction rate baselines.
              </template>
            </p>
          </div>

          <div class="pt-4 border-t border-border-hairline flex items-center justify-between">
            <router-link
              to="/analytics"
              class="inline-flex items-center gap-1.5 klx-mono-label text-ink hover:text-volt-ink transition-colors"
            >
              <span>Inspect Analytics</span>
              <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
            </router-link>
          </div>
        </div>

        <!-- Card 2: Active Brand Memory -->
        <div class="klx-card klx-card-interactive p-6 flex flex-col justify-between gap-5">
          <div v-if="loadingData" class="space-y-3">
            <div class="klx-skeleton h-3 w-28"></div>
            <div class="klx-skeleton h-8 w-16"></div>
            <div class="klx-skeleton h-12 w-full"></div>
          </div>

          <div v-else>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="klx-mono-label text-ink-muted">Brand Memory</span>
              <span class="klx-badge bg-canvas border border-border-hairline text-ink">
                ACTIVE RULES
              </span>
            </div>

            <div class="flex items-baseline gap-2.5">
              <span class="text-4xl font-bold klx-kpi text-ink leading-none">
                {{ activeMemoryCount }}
              </span>
              <span class="text-xs text-ink-muted font-mono uppercase tracking-wider">
                {{ activeMemoryCount === 1 ? 'Rule Locked' : 'Rules Locked' }}
              </span>
            </div>

            <div
              v-if="latestMemory"
              class="mt-4 pl-3 border-l-2 border-volt"
            >
              <p class="text-xs text-ink-secondary leading-relaxed line-clamp-3">
                “{{ latestMemory.statement }}”
              </p>
            </div>
            <p v-else class="mt-3 text-xs text-ink-secondary leading-relaxed">
              No locked rules yet. Review discovered patterns and promote verified signals into memory.
            </p>
          </div>

          <div class="pt-4 border-t border-border-hairline flex items-center justify-between">
            <router-link
              to="/memory"
              class="inline-flex items-center gap-1.5 klx-mono-label text-ink hover:text-volt-ink transition-colors"
            >
              <span>Open Constitution</span>
              <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
            </router-link>
          </div>
        </div>

        <!-- Card 3: Pending Draft Scripts -->
        <div class="klx-card klx-card-interactive p-6 flex flex-col justify-between gap-5">
          <div v-if="loadingData" class="space-y-3">
            <div class="klx-skeleton h-3 w-28"></div>
            <div class="klx-skeleton h-8 w-16"></div>
            <div class="klx-skeleton h-12 w-full"></div>
          </div>

          <div v-else>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="klx-mono-label text-ink-muted">Action Pipeline</span>
              <span class="klx-badge bg-canvas border border-border-hairline text-ink">
                DRAFT IDEAS
              </span>
            </div>

            <div class="flex items-baseline gap-2.5">
              <span class="text-4xl font-bold klx-kpi text-ink leading-none">
                {{ pendingIdeasCount }}
              </span>
              <span class="text-xs text-ink-muted font-mono uppercase tracking-wider">
                {{ pendingIdeasCount === 1 ? 'Pending Script' : 'Pending Scripts' }}
              </span>
            </div>

            <div
              v-if="nextPendingIdea"
              class="mt-4 p-3 bg-canvas border border-border-hairline rounded-[2px]"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="font-mono text-[10px] font-semibold uppercase tracking-wider text-volt-ink">
                  {{ nextPendingIdea.format }}
                </span>
                <span class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  NEXT UP
                </span>
              </div>
              <p class="text-xs font-semibold text-ink truncate">
                {{ nextPendingIdea.title }}
              </p>
            </div>
            <p v-else class="mt-3 text-xs text-ink-secondary leading-relaxed">
              Inbox clear. Generate a fresh content strategy to queue evidence-backed shoot concepts.
            </p>
          </div>

          <div class="pt-4 border-t border-border-hairline flex items-center justify-between">
            <router-link
              :to="latestStrategyId ? `/strategy/${latestStrategyId}/ideas` : '/strategy'"
              class="inline-flex items-center gap-1.5 klx-mono-label text-ink hover:text-volt-ink transition-colors"
            >
              <span>{{ latestStrategyId ? 'Ideation Board' : 'Generate Strategy' }}</span>
              <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
            </router-link>
          </div>
        </div>
      </div>

      <!-- SECTION 2: TELEMETRY INGESTION & SYNC PANEL -->
      <section class="klx-card overflow-hidden">
        <div class="px-5 py-4 bg-canvas border-b border-border-hairline flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <Cpu class="w-4 h-4 text-ink" :stroke-width="1.75" />
            <h2 class="klx-mono-label text-ink">Telemetry Ingestion Sources</h2>
          </div>

          <router-link
            to="/onboarding/connect"
            class="inline-flex items-center gap-1.5 klx-mono-label text-ink-secondary hover:text-ink transition-colors"
          >
            <Plus class="w-3.5 h-3.5" :stroke-width="2" />
            <span>Link Source</span>
          </router-link>
        </div>

        <div
          v-if="authStore.activeBrand.socialAccounts?.length > 0"
          class="divide-y divide-border-hairline"
        >
          <div
            v-for="account in authStore.activeBrand.socialAccounts"
            :key="account.id"
            class="p-5 sm:p-6 bg-surface space-y-4"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-4 min-w-0">
                <div class="w-11 h-11 bg-ink text-volt rounded-[2px] flex items-center justify-center shrink-0 font-display font-extrabold text-lg uppercase">
                  {{ account.platform.charAt(0) }}
                </div>

                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-display font-bold text-base text-ink uppercase tracking-tight">
                      {{ account.platform }}
                    </span>
                    <span class="font-mono text-xs text-ink-secondary">
                      @{{ account.username }}
                    </span>
                    <span class="klx-badge bg-status-positive-bg text-status-positive">
                      CONNECTED
                    </span>
                  </div>

                  <div class="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
                    <Clock class="w-3 h-3 shrink-0" :stroke-width="1.75" />
                    <span>
                      Last sync:
                      <strong class="text-ink-secondary font-medium">
                        {{ account.lastSync ? new Date(account.lastSync).toLocaleString() : 'Never' }}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div class="shrink-0">
                <button
                  v-if="syncingAccount !== account.id"
                  type="button"
                  @click="syncAccount(account)"
                  :disabled="Boolean(syncingAccount)"
                  class="klx-btn-outline px-4 py-2.5 text-xs font-mono uppercase tracking-wider w-full sm:w-auto"
                >
                  <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.75" />
                  <span>Sync Telemetry</span>
                </button>

                <div
                  v-else
                  class="klx-badge px-3.5 py-2.5 border"
                  :class="
                    syncJobState === 'RETRY_PENDING'
                      ? 'bg-status-warning-bg border-status-warning/40 text-status-warning'
                      : 'bg-volt border-ink text-ink'
                  "
                >
                  <span
                    class="klx-pulse-square"
                    :class="syncJobState === 'RETRY_PENDING' ? '!bg-status-warning' : '!bg-ink'"
                  ></span>
                  <span>
                    {{
                      syncJobState === 'RETRY_PENDING'
                        ? 'RATE LIMIT — RETRYING'
                        : `SYNCING ${syncProgress}%`
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Sharp Mechanical Sync Progress Bar -->
            <div v-if="syncingAccount === account.id" class="pt-2 space-y-2">
              <div class="w-full h-1.5 bg-surface-subtle overflow-hidden rounded-[1px]">
                <div
                  class="h-full transition-all duration-300"
                  :class="syncJobState === 'RETRY_PENDING' ? 'bg-status-warning' : 'bg-ink'"
                  :style="{ width: `${Math.max(5, syncProgress)}%` }"
                ></div>
              </div>
              <div class="flex items-center justify-between text-xs font-mono text-ink-secondary">
                <span>
                  {{
                    syncJobState === 'RETRY_PENDING'
                      ? 'High AI demand — automatically retrying in ~30s...'
                      : syncStatusText || 'Ingesting posts and recomputing baselines...'
                  }}
                </span>
                <span class="klx-kpi font-semibold text-ink">{{ syncProgress }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State: No Connected Sources -->
        <div v-else class="p-8 sm:p-10 bg-surface text-center flex flex-col items-center">
          <div class="w-12 h-12 bg-canvas border border-border-hairline rounded-[2px] flex items-center justify-center mb-4">
            <Link2 class="w-5 h-5 text-ink-muted" :stroke-width="1.75" />
          </div>
          <p class="text-sm font-semibold text-ink">No social data sources connected</p>
          <p class="mt-1 text-xs text-ink-secondary max-w-sm">
            Authorize your professional Instagram account to pull real post metrics and begin pattern discovery.
          </p>
          <router-link
            to="/onboarding/connect"
            class="mt-5 klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
          >
            <span>Connect Instagram</span>
            <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
          </router-link>
        </div>

        <!-- Sync Alerts -->
        <div
          v-if="syncError"
          role="alert"
          class="px-5 py-3.5 bg-status-negative-bg border-t border-status-negative/30 flex items-center gap-2.5 text-xs font-medium text-status-negative"
        >
          <AlertCircle class="w-4 h-4 shrink-0" :stroke-width="2" />
          <span>{{ syncError }}</span>
        </div>

        <div
          v-if="syncSuccess"
          role="status"
          class="px-5 py-3.5 bg-status-positive-bg border-t border-status-positive/30 flex items-center gap-2.5 text-xs font-medium text-status-positive"
        >
          <CheckCircle2 class="w-4 h-4 shrink-0" :stroke-width="2" />
          <span>Telemetry synchronized successfully. Analytics and patterns are up to date.</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { strategyApi } from '../services/strategyApi'
import {
  ArrowRight,
  RefreshCw,
  Link2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Cpu,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Plus
} from 'lucide-vue-next'

const authStore = useAuthStore()
const loading = ref(true)
const creating = ref(false)
const brandError = ref(null)
const newBrand = ref({ name: '', positioning: '' })

const syncingAccount = ref(null)
const syncProgress = ref(0)
const syncJobState = ref(null)
const syncStatusText = ref('')
const syncError = ref(null)
const syncSuccess = ref(false)
let pollInterval = null

// Dashboard specific state
const loadingData = ref(false)
const analyticsOverview = ref(null)

const activeMemoryCount = ref(0)
const latestMemory = ref(null)

const pendingIdeasCount = ref(0)
const nextPendingIdea = ref(null)
const latestStrategyId = ref(null)

const pipelineStatus = computed(() => {
  const hasSocial = Boolean(authStore.activeBrand?.socialAccounts?.length)
  const hasAnalytics = Boolean(analyticsOverview.value?.comparisons?.growth)
  const hasMemory = activeMemoryCount.value > 0
  const hasStrategy = Boolean(latestStrategyId.value)

  return [
    { step: '01', label: 'Meta Sync', to: '/onboarding/connect', complete: hasSocial },
    { step: '02', label: 'Catalogue', to: '/content', complete: hasSocial },
    { step: '03', label: 'Patterns', to: '/patterns', complete: hasAnalytics },
    { step: '04', label: 'Brand Memory', to: '/memory', complete: hasMemory },
    {
      step: '05',
      label: 'Scripts',
      to: latestStrategyId.value ? `/strategy/${latestStrategyId.value}/ideas` : '/strategy',
      complete: hasStrategy
    }
  ]
})

const fetchBrands = async () => {
  try {
    const res = await fetch('/api/v2/brands', { credentials: 'include' })
    if (res.ok) {
      const { data } = await res.json()
      if (data.brands && data.brands.length > 0) {
        authStore.setActiveBrand(data.brands[0])
      }
    }
  } catch (e) {
    console.error('Error fetching brands:', e)
  } finally {
    loading.value = false
  }
}

const fetchDashboardData = async () => {
  if (!authStore.activeBrand) return
  loadingData.value = true

  try {
    const [analyticsRes, memoryRes, strategyData] = await Promise.all([
      fetch(`/api/v2/brands/${authStore.activeBrand.id}/analytics/overview`, {
        credentials: 'include'
      }).catch(() => null),
      fetch(`/api/v2/brands/${authStore.activeBrand.id}/memory`, {
        credentials: 'include'
      }).catch(() => null),
      strategyApi.getActiveStrategy(authStore.activeBrand.id).catch(() => null)
    ])

    // Process Analytics
    if (analyticsRes && analyticsRes.ok) {
      const aData = await analyticsRes.json()
      analyticsOverview.value = aData.data || null
    }

    // Process Memory Rules
    if (memoryRes && memoryRes.ok) {
      const mData = await memoryRes.json()
      const memories = mData.data?.memories || []
      activeMemoryCount.value = memories.length
      latestMemory.value = memories.length > 0 ? memories[0] : null
    }

    // Process Action Pipeline (Strategy & Ideas)
    if (strategyData && strategyData.data) {
      const activeStrategy =
        strategyData.data.strategy ||
        (strategyData.data.strategies?.length > 0 ? strategyData.data.strategies[0] : null)

      if (activeStrategy) {
        latestStrategyId.value = activeStrategy.id

        const ideasData = await strategyApi
          .getIdeas(authStore.activeBrand.id, activeStrategy.id)
          .catch(() => null)

        if (ideasData && ideasData.data) {
          const drafts = (ideasData.data.ideas || []).filter((idea) => idea.status === 'DRAFT')
          pendingIdeasCount.value = drafts.length
          nextPendingIdea.value = drafts.length > 0 ? drafts[0] : null
        }
      }
    }
  } catch (e) {
    console.error('Dashboard data fetch error', e)
  } finally {
    loadingData.value = false
  }
}

const createBrand = async () => {
  creating.value = true
  brandError.value = null

  try {
    const res = await fetch('/api/v2/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBrand.value),
      credentials: 'include'
    })
    if (res.ok) {
      const { data } = await res.json()
      authStore.setActiveBrand(data.brand)
    } else {
      const err = await res.json().catch(() => ({}))
      brandError.value = err.message || err.error || 'Unable to create brand entity.'
    }
  } catch (e) {
    console.error('Error creating brand:', e)
    brandError.value = 'Network error while creating brand entity.'
  } finally {
    creating.value = false
  }
}

const syncAccount = async (account) => {
  if (syncingAccount.value) return

  syncingAccount.value = account.id
  syncProgress.value = 0
  syncJobState.value = 'QUEUED'
  syncStatusText.value = 'Queuing Meta Graph sync...'
  syncError.value = null
  syncSuccess.value = false

  const idempotencyKey = `sync-${account.id}-${Date.now()}`

  try {
    const res = await fetch(
      `/api/v2/brands/${authStore.activeBrand.id}/social-accounts/${account.id}/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
        credentials: 'include'
      }
    )

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || err.error || 'Failed to start sync')
    }

    const { data } = await res.json()
    startPolling(data.job.id)
  } catch (e) {
    console.error('Error starting sync:', e)
    syncError.value = e.message
    syncingAccount.value = null
    syncJobState.value = null
  }
}

const startPolling = (jobId) => {
  stopPolling()

  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/jobs/${jobId}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Job status request failed')

      const { data } = await res.json()
      const job = data.job

      syncProgress.value = job.progressPercent || 0
      syncJobState.value = job.state
      syncStatusText.value = job.progressMessage || job.progressStep || ''

      if (job.state === 'COMPLETED') {
        stopPolling()
        syncingAccount.value = null
        syncJobState.value = null
        syncSuccess.value = true
        await fetchBrands()
        await fetchDashboardData()
        authStore.triggerSyncUpdate()
        setTimeout(() => {
          syncSuccess.value = false
        }, 5000)
      } else if (job.state === 'FAILED' || job.state === 'CANCELLED') {
        stopPolling()
        syncingAccount.value = null
        syncJobState.value = null
        syncError.value = job.error?.message || job.error?.code || 'Sync failed'
      }
    } catch (e) {
      console.error('Error polling job:', e)
    }
  }, 2000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

const formatTrend = (trend) => {
  if (trend == null) return '-'
  const sign = trend > 0 ? '+' : ''
  return `${sign}${(trend * 100).toFixed(1)}%`
}

const getVerdictColor = (growth) => {
  if (growth === 'POSITIVE') return 'text-status-positive'
  if (growth === 'NEGATIVE') return 'text-status-negative'
  if (growth === 'STABLE') return 'text-status-warning'
  return 'text-ink-muted'
}

const getDeltaBadgeClass = (growth) => {
  if (growth === 'POSITIVE') {
    return 'bg-status-positive-bg border-status-positive/30 text-status-positive'
  }
  if (growth === 'NEGATIVE') {
    return 'bg-status-negative-bg border-status-negative/30 text-status-negative'
  }
  return 'bg-status-warning-bg border-status-warning/30 text-status-warning'
}

onMounted(() => {
  fetchBrands()
})

onUnmounted(() => {
  stopPolling()
})

watch(
  () => authStore.activeBrand,
  (brand) => {
    if (brand) fetchDashboardData()
  },
  { immediate: true }
)
</script>