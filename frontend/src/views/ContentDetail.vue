<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-6 pb-16">
    <!-- Top Utility Breadcrumb & Manual Analysis Trigger -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-hairline">
      <router-link
        to="/content"
        class="inline-flex items-center gap-2 klx-mono-label text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft class="w-3.5 h-3.5" :stroke-width="2" />
        <span>Back to Content Catalogue</span>
      </router-link>

      <div v-if="content" class="flex flex-wrap items-center gap-3">
        <a
          v-if="content.permalink"
          :href="content.permalink"
          target="_blank"
          rel="noopener noreferrer"
          class="klx-btn-outline px-3.5 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
        >
          <span>View on Instagram</span>
          <ExternalLink class="w-3.5 h-3.5" :stroke-width="1.75" />
        </a>

        <button
          type="button"
          @click="triggerAnalysis"
          :disabled="analyzing || isAnalysisInProgress"
          :class="
            needsAnalysisRetry
              ? 'klx-btn-volt px-4 py-2 text-xs font-mono uppercase tracking-wider'
              : 'klx-btn-outline px-3.5 py-2 text-xs font-mono uppercase tracking-wider bg-surface'
          "
        >
          <span
            v-if="analyzing || isAnalysisInProgress"
            class="klx-pulse-square !bg-ink"
          ></span>
          <Sparkles v-else class="w-3.5 h-3.5" :stroke-width="2" />
          <span>{{ analysisButtonLabel }}</span>
        </button>
      </div>
    </div>

    <!-- Analysis Trigger Feedback Banners -->
    <div
      v-if="analysisFeedback"
      role="status"
      class="p-3.5 bg-status-positive-bg border border-status-positive/35 rounded-[2px] flex items-center gap-2.5 text-xs font-medium text-status-positive"
    >
      <CheckCircle2 class="w-4 h-4 shrink-0" :stroke-width="2" />
      <span>{{ analysisFeedback }}</span>
    </div>

    <div
      v-if="analysisError"
      role="alert"
      class="p-3.5 bg-status-negative-bg border border-status-negative/35 rounded-[2px] flex items-center gap-2.5 text-xs font-medium text-status-negative"
    >
      <AlertCircle class="w-4 h-4 shrink-0" :stroke-width="2" />
      <span>{{ analysisError }}</span>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-5 klx-card overflow-hidden">
        <div class="aspect-[4/5] klx-skeleton rounded-none"></div>
        <div class="p-5 space-y-3">
          <div class="klx-skeleton h-3 w-28"></div>
          <div class="klx-skeleton h-16 w-full"></div>
        </div>
      </div>
      <div class="lg:col-span-7 space-y-5">
        <div class="klx-card p-6 space-y-4">
          <div class="klx-skeleton h-4 w-40"></div>
          <div class="klx-skeleton h-32 w-full"></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div v-for="i in 4" :key="i" class="klx-card p-4 space-y-2">
            <div class="klx-skeleton h-3 w-16"></div>
            <div class="klx-skeleton h-7 w-20"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      role="alert"
      class="klx-card p-10 text-center flex flex-col items-center border-status-negative/40"
    >
      <div class="w-12 h-12 bg-status-negative-bg border border-status-negative/30 rounded-[2px] flex items-center justify-center mb-4">
        <AlertCircle class="w-5 h-5 text-status-negative" :stroke-width="2" />
      </div>
      <p class="text-sm font-semibold text-status-negative">{{ error }}</p>
      <button
        type="button"
        @click="fetchDetail"
        class="mt-4 klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider"
      >
        <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Try Again</span>
      </button>
    </div>

    <!-- ===================================================================
         SPLIT MEDIA-LEFT / DIAGNOSTICS-RIGHT INSPECTOR
         =================================================================== -->
    <div v-else-if="content" class="space-y-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- LEFT COLUMN: Sticky Media Preview + Caption Metadata -->
        <aside class="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <div class="klx-card overflow-hidden">
            <div class="aspect-[4/5] bg-obsidian relative flex items-center justify-center overflow-hidden border-b border-border-hairline">
              <img
                v-if="primaryMedia && primaryMedia.displayUrl"
                :src="primaryMedia.displayUrl"
                alt="Content Media"
                class="w-full h-full object-cover"
              />
              <div v-else class="flex flex-col items-center gap-2 text-obsidian-muted">
                <ImageOff class="w-8 h-8" :stroke-width="1.5" />
                <span class="klx-mono-label">No Media Preview</span>
              </div>

              <span class="absolute top-3 right-3 klx-badge bg-obsidian/90 text-obsidian-ink border border-obsidian-border">
                {{ content.type }}
              </span>
            </div>

            <div class="p-5 bg-surface space-y-4">
              <div class="flex items-center justify-between gap-2 pb-3 border-b border-border-hairline">
                <span class="klx-mono-label text-ink-muted">Published</span>
                <span class="font-mono text-xs font-medium text-ink">
                  {{ formatDate(content.publishedAt) }}
                </span>
              </div>

              <div>
                <div class="klx-mono-label text-ink-muted mb-2">Original Caption</div>
                <p class="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap break-words max-h-56 overflow-y-auto pr-1">
                  {{ content.caption || 'No caption provided.' }}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <!-- RIGHT COLUMN: AI Diagnosis Inspector + Latest KPI Strip -->
        <div class="lg:col-span-7 space-y-6">
          <!-- AI DIAGNOSIS PANEL -->
          <section class="klx-card overflow-hidden">
            <!-- Panel Header -->
            <div class="px-5 py-4 bg-canvas border-b border-border-hairline flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="klx-mono-label text-volt-ink">Post Diagnostics</div>
                <h2 class="font-display font-bold text-xl text-ink tracking-tight mt-0.5">
                  AI Content Audit
                </h2>
              </div>

              <div class="flex items-center gap-2">
                <span
                  v-if="latestAnalysis"
                  class="klx-badge border"
                  :class="analysisStatusClasses(latestAnalysis.status)"
                >
                  {{ latestAnalysis.status }}
                  <template v-if="latestAnalysis.confidence != null">
                    &middot; {{ (latestAnalysis.confidence * 100).toFixed(0) }}% CONF
                  </template>
                </span>
                <span
                  v-else
                  class="klx-badge border bg-surface border-border-hairline text-ink-muted"
                >
                  {{ content.analysisStatus || 'NOT_STARTED' }}
                </span>
              </div>
            </div>

            <!-- In-Progress Polling Banner -->
            <div
              v-if="isAnalysisInProgress"
              class="p-6 bg-surface flex items-center justify-between gap-4"
            >
              <div class="flex items-center gap-3">
                <span class="klx-pulse-square"></span>
                <div>
                  <div class="text-sm font-semibold text-ink">
                    Running multimodal content audit...
                  </div>
                  <div class="text-xs text-ink-muted font-mono mt-0.5">
                    Status: {{ content.analysisStatus }} — refreshing automatically
                  </div>
                </div>
              </div>
            </div>

            <!-- Failed Analysis Recovery Box -->
            <div
              v-else-if="latestAnalysis?.status === 'FAILED' || content.analysisStatus === 'FAILED'"
              class="p-6 bg-surface space-y-4"
            >
              <div class="p-4 bg-status-negative-bg border border-status-negative/35 rounded-[2px] flex items-start gap-2.5 text-sm text-status-negative">
                <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
                <div>
                  <div class="font-semibold">Previous AI analysis did not complete.</div>
                  <div
                    v-if="latestAnalysis?.providerMeta?.error"
                    class="mt-1 font-mono text-xs opacity-85 break-words"
                  >
                    {{ latestAnalysis.providerMeta.error }}
                  </div>
                </div>
              </div>

              <button
                type="button"
                @click="triggerAnalysis"
                :disabled="analyzing"
                class="klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
              >
                <RefreshCw class="w-3.5 h-3.5" :stroke-width="2" />
                <span>{{ analyzing ? 'Queuing Retry...' : 'Retry AI Analysis' }}</span>
              </button>
            </div>

            <!-- Not Started Empty State -->
            <div
              v-else-if="!latestAnalysis"
              class="p-8 bg-surface text-center flex flex-col items-center"
            >
              <div class="w-11 h-11 bg-canvas border border-border-hairline rounded-[2px] flex items-center justify-center mb-3">
                <Sparkles class="w-5 h-5 text-ink-muted" :stroke-width="1.75" />
              </div>
              <p class="text-sm font-semibold text-ink">No AI audit recorded for this post</p>
              <p class="mt-1 text-xs text-ink-secondary max-w-sm">
                Run a targeted visual, narrative, and performance diagnosis without re-syncing your entire account.
              </p>
              <button
                type="button"
                @click="triggerAnalysis"
                :disabled="analyzing"
                class="mt-4 klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
              >
                <Sparkles class="w-3.5 h-3.5" :stroke-width="2" />
                <span>{{ analyzing ? 'Starting Audit...' : 'Run AI Analysis' }}</span>
              </button>
            </div>

            <!-- Completed / Partial Structured Findings (Tabbed for Zero Text-Wall) -->
            <div v-else class="bg-surface">
              <!-- Partial Warning Strip -->
              <div
                v-if="latestAnalysis.status === 'PARTIAL' && latestAnalysis.providerMeta?.error"
                class="mx-5 mt-5 p-3.5 bg-status-warning-bg border border-status-warning/35 rounded-[2px] flex items-start justify-between gap-3 text-xs text-status-warning"
              >
                <div class="flex items-start gap-2.5 min-w-0">
                  <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
                  <div class="min-w-0">
                    <div class="font-semibold">Partial analysis captured.</div>
                    <div class="font-mono text-[11px] mt-0.5 break-words opacity-85">
                      {{ latestAnalysis.providerMeta.error }}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  @click="triggerAnalysis"
                  :disabled="analyzing"
                  class="klx-btn-outline px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-surface shrink-0"
                >
                  Retry
                </button>
              </div>

              <!-- Diagnosis Domain Tabs -->
              <div class="px-5 pt-5 border-b border-border-hairline flex items-center gap-1">
                <button
                  v-for="tab in diagnosisTabs"
                  :key="tab.id"
                  type="button"
                  @click="activeDiagTab = tab.id"
                  class="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer -mb-px"
                  :class="
                    activeDiagTab === tab.id
                      ? 'border-ink text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  "
                >
                  <component :is="tab.icon" class="w-3.5 h-3.5" :stroke-width="1.75" />
                  <span>{{ tab.label }}</span>
                </button>
              </div>

              <!-- Active Tab Content -->
              <div class="p-5 sm:p-6">
                <!-- TAB: VISUAL -->
                <div v-if="activeDiagTab === 'visual'" class="space-y-4">
                  <template v-if="latestAnalysis.visualFindings">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div class="p-3.5 bg-canvas border border-border-hairline rounded-[2px]">
                        <div class="klx-mono-label text-ink-muted mb-1">Format Classification</div>
                        <div class="text-sm font-semibold text-ink">
                          {{ latestAnalysis.visualFindings.format_classification || 'N/A' }}
                        </div>
                      </div>
                      <div class="p-3.5 bg-canvas border border-border-hairline rounded-[2px]">
                        <div class="klx-mono-label text-ink-muted mb-1">Visual Quality</div>
                        <div class="text-sm font-semibold text-ink">
                          {{ latestAnalysis.visualFindings.visual_quality || 'N/A' }}
                        </div>
                      </div>
                    </div>

                    <div class="p-4 bg-canvas border-l-2 border-volt border-y border-r border-border-hairline rounded-[2px]">
                      <div class="klx-mono-label text-ink-muted mb-1.5">Hook Strength</div>
                      <p class="text-sm text-ink leading-relaxed">
                        {{ latestAnalysis.visualFindings.hook_strength || 'N/A' }}
                      </p>
                    </div>
                  </template>
                  <p v-else class="text-sm text-status-warning italic">
                    Visual analysis unavailable for this asset.
                  </p>
                </div>

                <!-- TAB: CONTENT -->
                <div v-else-if="activeDiagTab === 'content'" class="space-y-4">
                  <template v-if="latestAnalysis.contentFindings">
                    <div>
                      <div class="klx-mono-label text-ink-muted mb-2">Detected Themes</div>
                      <div
                        v-if="latestAnalysis.contentFindings.themes?.length"
                        class="flex flex-wrap gap-2"
                      >
                        <span
                          v-for="theme in latestAnalysis.contentFindings.themes"
                          :key="theme"
                          class="klx-badge bg-canvas border border-border-hairline text-ink"
                        >
                          {{ theme }}
                        </span>
                      </div>
                      <span v-else class="text-sm text-ink-muted">N/A</span>
                    </div>

                    <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
                      <div class="klx-mono-label text-ink-muted mb-1.5">Narrative Structure</div>
                      <p class="text-sm text-ink leading-relaxed">
                        {{ latestAnalysis.contentFindings.narrative_structure || 'N/A' }}
                      </p>
                    </div>

                    <div>
                      <div class="klx-mono-label text-ink-muted mb-2">Audience Signals</div>
                      <div
                        v-if="latestAnalysis.contentFindings.audience_signals?.length"
                        class="flex flex-wrap gap-2"
                      >
                        <span
                          v-for="signal in latestAnalysis.contentFindings.audience_signals"
                          :key="signal"
                          class="klx-badge bg-volt-tint border border-ink/25 text-ink"
                        >
                          {{ signal }}
                        </span>
                      </div>
                      <span v-else class="text-sm text-ink-muted">N/A</span>
                    </div>
                  </template>
                  <p v-else class="text-sm text-status-warning italic">
                    Content narrative analysis unavailable for this asset.
                  </p>
                </div>

                <!-- TAB: PERFORMANCE -->
                <div v-else class="space-y-4">
                  <div
                    v-if="latestAnalysis.providerMeta?.metricsObservedAt"
                    class="flex items-center justify-between text-xs font-mono text-ink-muted pb-2 border-b border-border-hairline"
                  >
                    <span>Snapshot Evaluated</span>
                    <span class="text-ink">{{ formatShortDate(latestAnalysis.providerMeta.metricsObservedAt) }}</span>
                  </div>

                  <template v-if="latestAnalysis.perfFindings">
                    <p class="text-sm text-ink leading-relaxed">
                      {{ latestAnalysis.perfFindings.metric_interpretation || 'N/A' }}
                    </p>

                    <div
                      v-if="latestAnalysis.perfFindings.performance_factors?.length"
                      class="p-4 bg-canvas border border-border-hairline rounded-[2px]"
                    >
                      <div class="klx-mono-label text-ink-muted mb-2.5">Key Drivers</div>
                      <ul class="space-y-2 text-sm text-ink-secondary">
                        <li
                          v-for="factor in latestAnalysis.perfFindings.performance_factors"
                          :key="factor"
                          class="flex items-start gap-2.5"
                        >
                          <span class="w-1.5 h-1.5 bg-volt border border-ink shrink-0 mt-2"></span>
                          <span>{{ factor }}</span>
                        </li>
                      </ul>
                    </div>
                  </template>
                  <p v-else class="text-sm text-status-warning italic">
                    Performance interpretation unavailable for this asset.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- LATEST METRICS KPI STRIP -->
          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="klx-mono-label text-ink">Latest Observed Telemetry</h2>
              <span v-if="latestMetrics" class="font-mono text-[11px] text-ink-muted">
                Observed {{ formatShortDate(latestMetrics.observedAt) }}
              </span>
            </div>

            <div v-if="latestMetrics" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                v-for="metric in metricDisplayList"
                :key="metric.key"
                class="klx-card p-4"
              >
                <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted truncate">
                  {{ metric.label }}
                </div>
                <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
                  {{
                    metric.format
                      ? metric.format(latestMetrics[metric.key])
                      : formatNumber(latestMetrics[metric.key])
                  }}
                </div>
              </div>
            </div>

            <div v-else class="klx-card p-6 text-center text-sm text-ink-muted">
              No metric snapshots recorded for this post yet.
            </div>
          </section>
        </div>
      </div>

      <!-- METRIC HISTORY LEDGER TABLE -->
      <section
        v-if="content.metricSnapshots && content.metricSnapshots.length > 0"
        class="klx-card overflow-hidden"
      >
        <div class="px-5 py-4 bg-canvas border-b border-border-hairline flex items-center justify-between">
          <h2 class="klx-mono-label text-ink">Metric Snapshot History</h2>
          <span class="klx-mono-label text-ink-muted">
            {{ content.metricSnapshots.length }} {{ content.metricSnapshots.length === 1 ? 'RECORD' : 'RECORDS' }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-canvas border-b border-border-hairline font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th class="px-4 py-3 font-semibold">Observed At</th>
                <th class="px-4 py-3 font-semibold text-right">Reach</th>
                <th class="px-4 py-3 font-semibold text-right">Plays</th>
                <th class="px-4 py-3 font-semibold text-right">Interactions</th>
                <th class="px-4 py-3 font-semibold text-right">Likes</th>
                <th class="px-4 py-3 font-semibold text-right">Comments</th>
                <th class="px-4 py-3 font-semibold text-right">Shares</th>
                <th class="px-4 py-3 font-semibold text-right">Saves</th>
                <th v-if="content.type === 'REEL'" class="px-4 py-3 font-semibold text-right">Avg Watch</th>
                <th v-if="content.type === 'REEL'" class="px-4 py-3 font-semibold text-right">Skip Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-hairline bg-surface klx-kpi text-xs">
              <tr
                v-for="snap in content.metricSnapshots"
                :key="snap.id"
                class="hover:bg-canvas/70 transition-colors"
              >
                <td class="px-4 py-3 font-sans font-medium text-ink whitespace-nowrap">
                  {{ formatShortDate(snap.observedAt) }}
                </td>
                <td class="px-4 py-3 text-right text-ink">{{ formatNumber(snap.reach) }}</td>
                <td class="px-4 py-3 text-right text-ink-secondary">{{ formatNumber(snap.plays) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-ink">
                  {{
                    formatNumber(
                      snap.totalInteractions ??
                        (snap.likes != null &&
                        snap.comments != null &&
                        snap.saves != null &&
                        snap.shares != null
                          ? snap.likes + snap.comments + snap.saves + snap.shares
                          : null)
                    )
                  }}
                  <span
                    v-if="
                      snap.totalInteractions == null &&
                      snap.likes != null &&
                      snap.comments != null &&
                      snap.saves != null &&
                      snap.shares != null
                    "
                    class="text-ink-muted ml-0.5"
                    title="Derived by Klarix"
                  >*</span>
                </td>
                <td class="px-4 py-3 text-right text-ink-secondary">{{ formatNumber(snap.likes) }}</td>
                <td class="px-4 py-3 text-right text-ink-secondary">{{ formatNumber(snap.comments) }}</td>
                <td class="px-4 py-3 text-right text-ink-secondary">{{ formatNumber(snap.shares) }}</td>
                <td class="px-4 py-3 text-right text-ink-secondary">{{ formatNumber(snap.saves) }}</td>
                <td v-if="content.type === 'REEL'" class="px-4 py-3 text-right whitespace-nowrap text-ink-secondary">
                  {{ formatTime(snap.igReelsAvgWatchTime) }}
                </td>
                <td v-if="content.type === 'REEL'" class="px-4 py-3 text-right whitespace-nowrap text-ink-secondary">
                  {{ formatPercentage(snap.reelsSkipRate) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  BarChart3,
  ImageOff
} from 'lucide-vue-next'

const route = useRoute()
const authStore = useAuthStore()

const content = ref(null)
const loading = ref(true)
const error = ref(null)

const activeDiagTab = ref('visual')
const diagnosisTabs = [
  { id: 'visual', label: 'Visual', icon: Eye },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'performance', label: 'Performance', icon: BarChart3 }
]

// Manual AI Analysis Trigger State
const analyzing = ref(false)
const analysisFeedback = ref(null)
const analysisError = ref(null)
let analysisPollTimer = null
let pollAttempts = 0

const currentContentId = computed(() => route.params.contentId)

const fetchDetail = async ({ silent = false } = {}) => {
  if (!silent) {
    loading.value = true
    error.value = null
  }

  try {
    const res = await fetch(`/api/v2/content/${currentContentId.value}`, {
      credentials: 'include'
    })

    if (res.status === 404) {
      throw new Error('Content not found or you do not have permission to view it.')
    }
    if (!res.ok) {
      throw new Error('Failed to load content details.')
    }

    const json = await res.json()
    content.value = json.data
  } catch (e) {
    console.error('Error fetching content detail:', e)
    if (!silent) {
      error.value = e.message || 'We encountered an error loading this content.'
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

const stopAnalysisPolling = () => {
  if (analysisPollTimer) {
    clearInterval(analysisPollTimer)
    analysisPollTimer = null
  }
  pollAttempts = 0
}

const startAnalysisPolling = () => {
  stopAnalysisPolling()
  pollAttempts = 0

  analysisPollTimer = setInterval(async () => {
    pollAttempts += 1
    await fetchDetail({ silent: true })

    const status = content.value?.analysisStatus
    const settled = ['COMPLETED', 'PARTIAL', 'FAILED'].includes(status)

    if (settled || pollAttempts >= 24) {
      stopAnalysisPolling()
      if (status === 'COMPLETED') {
        analysisFeedback.value = 'AI content audit completed successfully.'
        setTimeout(() => {
          analysisFeedback.value = null
        }, 4500)
      }
    }
  }, 2500)
}

const triggerAnalysis = async () => {
  if (analyzing.value) return
  analyzing.value = true
  analysisError.value = null
  analysisFeedback.value = null

  try {
    const res = await fetch(`/api/v2/content/${currentContentId.value}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(payload?.message || payload?.error || 'Could not start AI analysis.')
    }

    analysisFeedback.value =
      payload?.message || 'AI analysis queued. Updating diagnostics automatically...'
    await fetchDetail({ silent: true })

    if (isAnalysisInProgress.value) {
      startAnalysisPolling()
    } else {
      setTimeout(() => {
        analysisFeedback.value = null
      }, 4500)
    }
  } catch (e) {
    analysisError.value = e.message || 'Failed to trigger AI analysis.'
  } finally {
    analyzing.value = false
  }
}

const primaryMedia = computed(() => {
  if (content.value?.media?.length > 0) {
    const m = content.value.media[0]
    const type = content.value.type
    return {
      ...m,
      displayUrl:
        type === 'VIDEO' || type === 'REEL'
          ? m.thumbnailUrl || null
          : m.thumbnailUrl || m.sourceUrl
    }
  }
  return null
})

const latestMetrics = computed(() => {
  if (content.value?.metricSnapshots?.length > 0) {
    const snap = { ...content.value.metricSnapshots[0] }
    if (
      snap.totalInteractions == null &&
      snap.likes != null &&
      snap.comments != null &&
      snap.saves != null &&
      snap.shares != null
    ) {
      snap.totalInteractions = snap.likes + snap.comments + snap.saves + snap.shares
      snap._isDerivedInteractions = true
    }
    return snap
  }
  return null
})

const latestAnalysis = computed(() => {
  if (content.value?.analyses?.length > 0) {
    return content.value.analyses[0]
  }
  return null
})

const isAnalysisInProgress = computed(() => {
  const status = content.value?.analysisStatus
  return ['PENDING', 'PROCESSING', 'QUEUED', 'IN_PROGRESS', 'RETRY_PENDING'].includes(status)
})

const needsAnalysisRetry = computed(() => {
  if (!content.value) return false
  const status = content.value.analysisStatus
  return (
    !latestAnalysis.value ||
    status === 'FAILED' ||
    status === 'NOT_STARTED' ||
    latestAnalysis.value.status === 'FAILED' ||
    latestAnalysis.value.status === 'PARTIAL'
  )
})

const analysisButtonLabel = computed(() => {
  if (analyzing.value) return 'Queuing Audit...'
  if (isAnalysisInProgress.value) return 'Audit Running...'
  if (!latestAnalysis.value && content.value?.analysisStatus === 'NOT_STARTED') {
    return 'Run AI Analysis'
  }
  if (needsAnalysisRetry.value) return 'Retry AI Analysis'
  return 'Re-run AI Analysis'
})

const metricDisplayList = computed(() => {
  if (!latestMetrics.value) return []
  const items = [{ key: 'reach', label: 'Reach', format: formatNumber }]
  if (content.value?.type !== 'REEL') {
    items.push({ key: 'impressions', label: 'Impressions', format: formatNumber })
  }
  items.push(
    { key: 'plays', label: 'Plays', format: formatNumber },
    {
      key: 'totalInteractions',
      label: latestMetrics.value._isDerivedInteractions ? 'Interactions*' : 'Interactions',
      format: formatNumber
    },
    { key: 'likes', label: 'Likes', format: formatNumber },
    { key: 'comments', label: 'Comments', format: formatNumber },
    { key: 'shares', label: 'Shares', format: formatNumber },
    { key: 'saves', label: 'Saves', format: formatNumber }
  )
  if (content.value?.type === 'REEL') {
    items.push(
      { key: 'igReelsAvgWatchTime', label: 'Avg Watch Time', format: formatTime },
      { key: 'igReelsVideoViewTotalTime', label: 'Total View Time', format: formatTime },
      { key: 'reelsSkipRate', label: 'Skip Rate', format: formatPercentage }
    )
  }
  return items
})

const analysisStatusClasses = (status) => {
  if (status === 'COMPLETED') {
    return 'bg-status-positive-bg border-status-positive/35 text-status-positive'
  }
  if (status === 'PARTIAL') {
    return 'bg-status-warning-bg border-status-warning/40 text-status-warning'
  }
  if (status === 'FAILED') {
    return 'bg-status-negative-bg border-status-negative/35 text-status-negative'
  }
  return 'bg-surface border-border-hairline text-ink-muted'
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown Date'
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatShortDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatNumber = (num) => {
  if (num === null || num === undefined) return '—'
  return new Intl.NumberFormat().format(num)
}

const formatTime = (ms) => {
  if (ms === null || ms === undefined) return '—'
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const formatPercentage = (val) => {
  if (val === null || val === undefined) return '—'
  return `${val}%`
}

onMounted(async () => {
  await fetchDetail()
  if (isAnalysisInProgress.value) {
    startAnalysisPolling()
  }
})

onUnmounted(() => {
  stopAnalysisPolling()
})

watch(currentContentId, async () => {
  stopAnalysisPolling()
  analysisFeedback.value = null
  analysisError.value = null
  await fetchDetail()
})

watch(
  () => authStore.lastSyncTimestamp,
  () => {
    fetchDetail({ silent: true })
  }
)
</script>