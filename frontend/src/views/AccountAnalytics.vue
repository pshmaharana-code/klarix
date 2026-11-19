<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-6 pb-12">
    <!-- Header & Compact Architectural Filter Bar -->
    <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-5 border-b border-border-hairline">
      <div>
        <p class="klx-mono-label text-volt-ink mb-1.5">02 / Empirical Telemetry</p>
        <h1 class="font-display font-extrabold text-3xl sm:text-4xl tracking-[-0.03em] text-ink leading-none">
          Account Analytics
        </h1>
        <p class="mt-2 text-sm text-ink-secondary">
          Interaction velocity, account baselines, and format-level cohort performance.
        </p>
      </div>

      <div class="klx-card p-3 flex flex-wrap items-end gap-3">
        <div>
          <label for="filter-format" class="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
            Format
          </label>
          <select
            id="filter-format"
            v-model="filters.contentType"
            @change="fetchMetrics"
            class="klx-input px-3 py-1.5 text-xs font-medium w-32"
          >
            <option value="">All Types</option>
            <option value="REEL">Reel</option>
            <option value="CAROUSEL">Carousel</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
          </select>
        </div>

        <div>
          <label for="filter-from" class="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
            From
          </label>
          <input
            id="filter-from"
            type="date"
            v-model="filters.from"
            @change="fetchMetrics"
            class="klx-input px-2.5 py-1.5 text-xs font-mono"
          />
        </div>

        <div>
          <label for="filter-to" class="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
            To
          </label>
          <input
            id="filter-to"
            type="date"
            v-model="filters.to"
            @change="fetchMetrics"
            class="klx-input px-2.5 py-1.5 text-xs font-mono"
          />
        </div>

        <button
          type="button"
          @click="clearFilters"
          class="klx-btn-outline px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider h-[30px]"
        >
          <RotateCcw class="w-3 h-3" :stroke-width="2" />
          <span>Reset</span>
        </button>
      </div>
    </div>

    <!-- Filter Validation Error -->
    <div
      v-if="filterError"
      role="alert"
      class="p-3.5 bg-status-warning-bg border border-status-warning/35 rounded-[2px] flex items-center gap-2.5 text-xs font-medium text-status-warning"
    >
      <AlertTriangle class="w-4 h-4 shrink-0" :stroke-width="2" />
      <span>{{ filterError }}</span>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-6">
      <div class="klx-card p-6 space-y-4">
        <div class="klx-skeleton h-4 w-48"></div>
        <div class="klx-skeleton h-52 w-full"></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="klx-card p-6 space-y-3">
          <div class="klx-skeleton h-3 w-24"></div>
          <div class="klx-skeleton h-9 w-28"></div>
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
        @click="fetchMetrics"
        class="mt-4 klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        Retry Connection
      </button>
    </div>

    <!-- No Brand Selected -->
    <div v-else-if="!authStore.activeBrand" class="klx-card p-12 text-center">
      <h2 class="font-display font-bold text-xl text-ink">No Brand Initialized</h2>
      <p class="mt-1.5 text-sm text-ink-secondary">
        Create your brand entity on the Command Center to unlock account analytics.
      </p>
      <router-link
        to="/dashboard"
        class="mt-5 klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
      >
        <span>Open Command Center</span>
      </router-link>
    </div>

    <!-- Empty Telemetry State -->
    <div v-else-if="!hasData" class="klx-card p-12 text-center flex flex-col items-center">
      <div class="w-12 h-12 bg-canvas border border-border-hairline rounded-[2px] flex items-center justify-center mb-4">
        <LineChart class="w-5 h-5 text-ink-muted" :stroke-width="1.75" />
      </div>
      <h2 class="font-display font-bold text-xl text-ink">No Telemetry Matching Filters</h2>
      <p class="mt-1.5 text-sm text-ink-secondary max-w-md">
        No synced posts match your current format or date range. Reset filters or trigger a telemetry sync.
      </p>
    </div>

    <!-- ===================================================================
         POPULATED ANALYTICS WORKSPACE
         =================================================================== -->
    <div v-else class="space-y-6">
      <!-- Partial Data Notice -->
      <div
        v-if="hasPartialData"
        class="p-3.5 bg-status-warning-bg border border-status-warning/35 rounded-[2px] flex items-center gap-2.5 text-xs font-medium text-status-warning"
      >
        <AlertTriangle class="w-4 h-4 shrink-0" :stroke-width="2" />
        <span>
          <strong>Partial source telemetry:</strong> Some older posts lack complete Meta insight fields and are excluded from macro averages.
        </span>
      </div>

      <!-- INTERACTIVE INTERACTION RATE TRENDLINE CHART + MACRO VERDICT -->
      <section class="klx-card overflow-hidden">
        <!-- Top Verdict & Interactive Point Readout Header -->
        <div class="p-5 sm:p-6 bg-surface border-b border-border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2.5 mb-1.5">
              <span class="klx-mono-label text-ink-muted">Interaction Rate Over Time</span>
              <span
                v-if="metricsData.comparisons?.growth"
                class="klx-badge border"
                :class="getVerdictBadgeClass(metricsData.comparisons.growth)"
              >
                <TrendingUp
                  v-if="metricsData.comparisons.growth === 'POSITIVE'"
                  class="w-3 h-3"
                  :stroke-width="2.25"
                />
                <TrendingDown
                  v-else-if="metricsData.comparisons.growth === 'NEGATIVE'"
                  class="w-3 h-3"
                  :stroke-width="2.25"
                />
                <Minus v-else class="w-3 h-3" :stroke-width="2.25" />
                <span>
                  {{ metricsData.comparisons.growth }}
                  ({{ formatTrend(metricsData.comparisons.interactionRateTrend) }})
                </span>
              </span>
            </div>
            <p class="text-xs text-ink-secondary">
              Each square marks a published post against your dashed
              <strong class="text-ink klx-kpi">{{ formatPercent(metricsData.overview?.avgInteractionRate) }}</strong>
              account baseline. Click any point to inspect that asset.
            </p>
          </div>

          <!-- Active Hovered Post Telemetry Strip -->
          <div class="px-4 py-2.5 bg-canvas border border-border-hairline rounded-[2px] min-w-[240px]">
            <template v-if="activeChartPoint">
              <div class="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                <span>{{ formatDate(activeChartPoint.date) }}</span>
                <span class="text-ink font-semibold">{{ activeChartPoint.type }}</span>
              </div>
              <div class="mt-1 flex items-baseline justify-between gap-3">
                <span class="text-lg font-bold klx-kpi text-ink">
                  {{ formatPercent(activeChartPoint.interactionRate) }}
                </span>
                <span class="font-mono text-[11px] text-ink-secondary">
                  {{ formatNumber(activeChartPoint.reach) }} reach
                </span>
              </div>
            </template>
            <template v-else>
              <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Baseline Average
              </div>
              <div class="mt-1 flex items-baseline justify-between gap-3">
                <span class="text-lg font-bold klx-kpi text-ink">
                  {{ formatPercent(metricsData.overview?.avgInteractionRate) }}
                </span>
                <span class="font-mono text-[11px] text-ink-muted">
                  {{ chartSeries.length }} plotted posts
                </span>
              </div>
            </template>
          </div>
        </div>

        <!-- Razor-Sharp Inline SVG Trendline Canvas -->
        <div class="p-4 sm:p-6 bg-canvas">
          <div v-if="chartSeries.length >= 2" class="w-full overflow-x-auto">
            <svg
              :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
              class="w-full h-56 sm:h-64 min-w-[540px] select-none"
              role="img"
              aria-label="Interaction rate over time chart"
            >
              <!-- Horizontal Hairline Grid & Y-Axis Labels -->
              <g v-for="tick in yTicks" :key="tick.label">
                <line
                  :x1="PAD_L"
                  :x2="CHART_W - PAD_R"
                  :y1="tick.y"
                  :y2="tick.y"
                  stroke="#E2E2DE"
                  stroke-width="1"
                />
                <text
                  :x="PAD_L - 10"
                  :y="tick.y + 3"
                  text-anchor="end"
                  class="fill-[#71717A] font-mono text-[10px]"
                >
                  {{ tick.label }}
                </text>
              </g>

              <!-- Account Baseline Dashed Line -->
              <g v-if="baselineY != null">
                <line
                  :x1="PAD_L"
                  :x2="CHART_W - PAD_R"
                  :y1="baselineY"
                  :y2="baselineY"
                  stroke="#020202"
                  stroke-width="1"
                  stroke-dasharray="4 4"
                  opacity="0.55"
                />
                <rect
                  :x="CHART_W - PAD_R - 72"
                  :y="baselineY - 17"
                  width="72"
                  height="14"
                  fill="#020202"
                  rx="1"
                />
                <text
                  :x="CHART_W - PAD_R - 36"
                  :y="baselineY - 7"
                  text-anchor="middle"
                  class="fill-[#CBFF00] font-mono text-[9px] font-semibold"
                >
                  BASELINE
                </text>
              </g>

              <!-- Subtle Area Fill Beneath Trendline -->
              <polygon
                v-if="chartAreaPoints"
                :points="chartAreaPoints"
                fill="rgba(2, 2, 2, 0.045)"
              />

              <!-- Primary Interaction Trend Polyline -->
              <polyline
                :points="chartLinePoints"
                fill="none"
                stroke="#020202"
                stroke-width="1.75"
                stroke-linejoin="miter"
              />

              <!-- Interactive Square Data Nodes -->
              <g
                v-for="(pt, idx) in chartPoints"
                :key="pt.contentId"
                class="cursor-pointer"
                @mouseenter="hoveredPointIdx = idx"
                @mouseleave="hoveredPointIdx = null"
                @click="$router.push(`/content/${pt.contentId}`)"
              >
                <!-- Expanded invisible hit target for easy hover/click -->
                <rect
                  :x="pt.x - 10"
                  :y="PAD_T"
                  width="20"
                  :height="CHART_H - PAD_T - PAD_B"
                  fill="transparent"
                />

                <!-- Vertical Crosshair on Active Hover -->
                <line
                  v-if="hoveredPointIdx === idx"
                  :x1="pt.x"
                  :x2="pt.x"
                  :y1="PAD_T"
                  :y2="CHART_H - PAD_B"
                  stroke="#020202"
                  stroke-width="1"
                  opacity="0.25"
                />

                <!-- Sharp Architectural Node Square -->
                <rect
                  :x="pt.x - (hoveredPointIdx === idx ? 5 : 3.5)"
                  :y="pt.y - (hoveredPointIdx === idx ? 5 : 3.5)"
                  :width="hoveredPointIdx === idx ? 10 : 7"
                  :height="hoveredPointIdx === idx ? 10 : 7"
                  :fill="pt.aboveBaseline ? '#CBFF00' : '#FFFFFF'"
                  stroke="#020202"
                  stroke-width="1.5"
                />
              </g>

              <!-- X-Axis Start / Mid / End Date Labels -->
              <text
                v-for="xTick in xTicks"
                :key="xTick.label + xTick.x"
                :x="xTick.x"
                :y="CHART_H - 6"
                :text-anchor="xTick.anchor"
                class="fill-[#71717A] font-mono text-[10px]"
              >
                {{ xTick.label }}
              </text>
            </svg>
          </div>

          <div
            v-else
            class="py-10 text-center font-mono text-xs text-ink-muted"
          >
            At least 2 posts with interaction rates are needed to plot a trendline.
          </div>

          <!-- Chart Legend -->
          <div class="mt-3 pt-3 border-t border-border-hairline flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-ink-muted">
            <div class="flex flex-wrap items-center gap-5">
              <span class="inline-flex items-center gap-2">
                <span class="w-2.5 h-2.5 bg-volt border border-ink inline-block"></span>
                <span>Above Baseline</span>
              </span>
              <span class="inline-flex items-center gap-2">
                <span class="w-2.5 h-2.5 bg-surface border border-ink inline-block"></span>
                <span>At / Below Baseline</span>
              </span>
              <span class="inline-flex items-center gap-2">
                <span class="w-5 border-t border-dashed border-ink inline-block"></span>
                <span>Account Baseline</span>
              </span>
            </div>
            <span>Click any node to inspect asset</span>
          </div>
        </div>
      </section>

      <!-- FORMAT BREAKDOWN STRIP (Derived Live from Series) -->
      <section v-if="formatBreakdown.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          v-for="fmt in formatBreakdown"
          :key="fmt.type"
          class="klx-card p-4 flex flex-col justify-between gap-2"
        >
          <div class="flex items-center justify-between">
            <span class="klx-badge bg-canvas border border-border-hairline text-ink">
              {{ fmt.type }}
            </span>
            <span class="font-mono text-[11px] text-ink-muted">
              {{ fmt.count }} {{ fmt.count === 1 ? 'post' : 'posts' }}
            </span>
          </div>
          <div class="pt-2 flex items-baseline justify-between">
            <span class="text-xl font-bold klx-kpi text-ink">
              {{ formatPercent(fmt.avgRate) }}
            </span>
            <span class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Avg Rate
            </span>
          </div>
        </div>
      </section>

      <!-- PRIMARY & SECONDARY KPI GRID -->
      <section v-if="metricsData.overview" class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Primary Macro Metrics -->
        <div class="lg:col-span-4 klx-card p-6 flex flex-col justify-between gap-5">
          <div>
            <div class="klx-mono-label text-ink-muted">Analyzed Assets</div>
            <div class="mt-1 text-4xl font-bold klx-kpi text-ink">
              {{ metricsData.overview.totalContent }}
            </div>
          </div>
          <div class="h-px bg-border-hairline"></div>
          <div>
            <div class="klx-mono-label text-ink-muted">Average Reach</div>
            <div class="mt-1 text-4xl font-bold klx-kpi text-ink">
              {{ formatNumber(metricsData.overview.avgReach) }}
            </div>
          </div>
          <div class="h-px bg-border-hairline"></div>
          <div class="p-3.5 bg-volt-tint border border-ink rounded-[2px]">
            <div class="klx-mono-label text-ink">Avg Interaction Rate</div>
            <div class="mt-1 text-3xl font-bold klx-kpi text-ink">
              {{ formatPercent(metricsData.overview.avgInteractionRate) }}
            </div>
          </div>
        </div>

        <!-- Secondary Conversion Diagnostics -->
        <div class="lg:col-span-8 klx-card p-6 flex flex-col justify-between">
          <div class="klx-mono-label text-ink-muted mb-5">Secondary Conversion Diagnostics</div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
              <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Impressions</div>
              <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
                {{ formatNumber(metricsData.overview.avgImpressions) }}
              </div>
            </div>
            <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
              <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Like Rate</div>
              <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
                {{ formatPercent(metricsData.overview.avgLikeRate) }}
              </div>
            </div>
            <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
              <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Comment Rate</div>
              <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
                {{ formatPercent(metricsData.overview.avgCommentRate) }}
              </div>
            </div>
            <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
              <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Save Rate</div>
              <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
                {{ formatPercent(metricsData.overview.avgSaveRate) }}
              </div>
            </div>
            <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
              <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Share Rate</div>
              <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
                {{ formatPercent(metricsData.overview.avgShareRate) }}
              </div>
            </div>
            <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
              <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">View / Reach</div>
              <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
                {{ formatNumber(metricsData.overview.avgViewToReachRatio, 2) }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SORTABLE ASSET PERFORMANCE LOG TABLE -->
      <section
        v-if="sortedSeries.length > 0"
        class="klx-card overflow-hidden"
      >
        <div class="px-5 py-4 bg-canvas border-b border-border-hairline flex flex-wrap items-center justify-between gap-3">
          <h2 class="klx-mono-label text-ink">Asset Performance Log</h2>
          <span class="font-mono text-[11px] text-ink-muted">
            Click column headers to sort &middot; {{ sortedSeries.length }} posts
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-canvas border-b border-border-hairline font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th scope="col" class="px-5 py-3.5">
                  <button
                    type="button"
                    @click="toggleSort('date')"
                    class="inline-flex items-center gap-1 hover:text-ink cursor-pointer uppercase"
                  >
                    <span>Publish Date</span>
                    <ArrowUpDown class="w-3 h-3" :stroke-width="2" />
                  </button>
                </th>
                <th scope="col" class="px-5 py-3.5">Format</th>
                <th scope="col" class="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    @click="toggleSort('reach')"
                    class="inline-flex items-center gap-1 hover:text-ink cursor-pointer uppercase"
                  >
                    <span>Reach</span>
                    <ArrowUpDown class="w-3 h-3" :stroke-width="2" />
                  </button>
                </th>
                <th scope="col" class="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    @click="toggleSort('interactionRate')"
                    class="inline-flex items-center gap-1 hover:text-ink cursor-pointer uppercase"
                  >
                    <span>Interaction</span>
                    <ArrowUpDown class="w-3 h-3" :stroke-width="2" />
                  </button>
                </th>
                <th scope="col" class="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    @click="toggleSort('percentile')"
                    class="inline-flex items-center gap-1 hover:text-ink cursor-pointer uppercase"
                  >
                    <span>Cohort Rank</span>
                    <ArrowUpDown class="w-3 h-3" :stroke-width="2" />
                  </button>
                </th>
                <th scope="col" class="px-5 py-3.5 text-right">Vs Baseline</th>
                <th scope="col" class="px-5 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-hairline bg-surface">
              <tr
                v-for="row in sortedSeries"
                :key="row.contentId"
                class="hover:bg-canvas/70 transition-colors"
              >
                <td class="px-5 py-3.5 text-xs font-medium text-ink whitespace-nowrap">
                  {{ formatDate(row.date) }}
                </td>
                <td class="px-5 py-3.5">
                  <span class="klx-badge bg-canvas border border-border-hairline text-ink">
                    {{ row.type }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right klx-kpi text-xs text-ink-secondary">
                  {{ formatNumber(row.reach) }}
                </td>
                <td class="px-5 py-3.5 text-right klx-kpi text-xs font-bold text-ink">
                  {{ formatPercent(row.interactionRate) }}
                </td>
                <td class="px-5 py-3.5 text-right">
                  <span
                    v-if="row.percentileComparison?.interactionRate != null"
                    class="klx-badge bg-canvas border border-border-strong text-ink"
                  >
                    P{{ row.percentileComparison.interactionRate }}
                  </span>
                  <span v-else class="text-ink-muted">—</span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <div v-if="row.baselineComparison" class="inline-flex justify-end">
                    <span
                      class="klx-badge border"
                      :class="getBaselineBadgeClass(row.baselineComparison.performance)"
                    >
                      {{ getBaselineSymbol(row.baselineComparison.performance) }}
                      {{ formatPercent(Math.abs(row.baselineComparison.interactionRateDelta)) }}
                    </span>
                  </div>
                  <span v-else class="text-ink-muted">—</span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <router-link
                    :to="`/content/${row.contentId}`"
                    class="inline-flex items-center gap-1 klx-mono-label text-ink hover:text-volt-ink transition-colors"
                  >
                    <span>Open</span>
                    <ArrowRight class="w-3 h-3" :stroke-width="2" />
                  </router-link>
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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  LineChart,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ArrowUpDown,
  RotateCcw
} from 'lucide-vue-next'

const authStore = useAuthStore()
const loading = ref(false)
const error = ref(null)
const filterError = ref(null)
const metricsData = ref({})
const filters = ref({
  contentType: '',
  from: '',
  to: ''
})

// Sorting State
const sortKey = ref('date')
const sortDir = ref('desc')

// SVG Chart Geometry Constants
const CHART_W = 860
const CHART_H = 240
const PAD_L = 56
const PAD_R = 20
const PAD_T = 22
const PAD_B = 28
const hoveredPointIdx = ref(null)

let activeRequestController = null
const analyticsUnavailableMessage = 'Telemetry stream unavailable. Please check your connection.'

const parseJsonResponse = async (response) => {
  const body = await response.text()
  if (!body) return null
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

const clearFilters = () => {
  filters.value = { contentType: '', from: '', to: '' }
  fetchMetrics()
}

const validateFilters = () => {
  filterError.value = null
  if (filters.value.from && filters.value.to && filters.value.from > filters.value.to) {
    filterError.value = 'Chronological error: From date must precede To date.'
    return false
  }
  return true
}

const toFilterIso = (dateString, endOfDay = false) => {
  const time = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'
  return new Date(`${dateString}${time}`).toISOString()
}

const ensureActiveBrand = async (signal) => {
  if (authStore.activeBrand) return true
  const res = await fetch('/api/v2/brands', { credentials: 'include', signal })
  if (!res.ok) throw new Error('Could not synchronize brand context')
  const { data } = await res.json()
  const brand = data?.brands?.[0]
  if (brand) authStore.setActiveBrand(brand)
  return Boolean(brand)
}

const fetchMetrics = async () => {
  if (!validateFilters()) return

  activeRequestController?.abort()
  const requestController = new AbortController()
  activeRequestController = requestController

  loading.value = true
  error.value = null

  try {
    const hasBrand = await ensureActiveBrand(requestController.signal)
    if (!hasBrand) {
      metricsData.value = {}
      return
    }

    const queryParams = new URLSearchParams()
    if (filters.value.contentType) queryParams.append('contentType', filters.value.contentType)
    if (filters.value.from) queryParams.append('from', toFilterIso(filters.value.from))
    if (filters.value.to) queryParams.append('to', toFilterIso(filters.value.to, true))

    const qs = queryParams.toString()
    const url = `/api/v2/brands/${authStore.activeBrand.id}/analytics/overview${qs ? `?${qs}` : ''}`

    const res = await fetch(url, { credentials: 'include', signal: requestController.signal })
    const payload = await parseJsonResponse(res)

    if (!res.ok) {
      throw new Error(payload?.message || payload?.error?.message || analyticsUnavailableMessage)
    }
    if (!payload?.data) throw new Error(analyticsUnavailableMessage)

    if (requestController.signal.aborted || activeRequestController !== requestController) return
    metricsData.value = payload.data || {}
  } catch (e) {
    if (e.name === 'AbortError') return
    error.value =
      e instanceof TypeError ? analyticsUnavailableMessage : e.message || analyticsUnavailableMessage
  } finally {
    if (activeRequestController === requestController) {
      activeRequestController = null
      loading.value = false
    }
  }
}

const hasData = computed(
  () => Boolean(metricsData.value?.overview && metricsData.value.overview.totalContent > 0)
)

const hasPartialData = computed(() => {
  const rows = metricsData.value?.series || []
  return rows.some((row) =>
    [
      row.reach,
      row.impressions,
      row.plays,
      row.likeRate,
      row.commentRate,
      row.saveRate,
      row.shareRate,
      row.interactionRate,
      row.viewToReachRatio
    ].some((value) => value == null)
  )
})

// ─── SVG Trendline Chart Computations ───
const chartSeries = computed(() => {
  const rows = (metricsData.value?.series || []).filter(
    (r) => typeof r.interactionRate === 'number' && Number.isFinite(r.interactionRate)
  )
  return [...rows].sort((a, b) => new Date(a.date) - new Date(b.date))
})

const chartMaxVal = computed(() => {
  const vals = chartSeries.value.map((r) => r.interactionRate)
  const base = metricsData.value?.overview?.avgInteractionRate
  if (typeof base === 'number' && Number.isFinite(base)) vals.push(base)
  const rawMax = Math.max(...vals, 0.01)
  return rawMax * 1.15
})

const valueToY = (val) => {
  const usableH = CHART_H - PAD_T - PAD_B
  const ratio = Math.max(0, Math.min(1, val / chartMaxVal.value))
  return PAD_T + usableH * (1 - ratio)
}

const baselineY = computed(() => {
  const base = metricsData.value?.overview?.avgInteractionRate
  if (typeof base !== 'number' || !Number.isFinite(base)) return null
  return valueToY(base)
})

const chartPoints = computed(() => {
  const list = chartSeries.value
  if (list.length < 2) return []
  const usableW = CHART_W - PAD_L - PAD_R
  const baseline = metricsData.value?.overview?.avgInteractionRate ?? 0

  return list.map((row, i) => ({
    ...row,
    x: PAD_L + (i / (list.length - 1)) * usableW,
    y: valueToY(row.interactionRate),
    aboveBaseline: row.interactionRate >= baseline
  }))
})

const chartLinePoints = computed(() =>
  chartPoints.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
)

const chartAreaPoints = computed(() => {
  if (chartPoints.value.length < 2) return ''
  const first = chartPoints.value[0]
  const last = chartPoints.value[chartPoints.value.length - 1]
  const bottomY = CHART_H - PAD_B
  return `${first.x.toFixed(1)},${bottomY} ${chartLinePoints.value} ${last.x.toFixed(1)},${bottomY}`
})

const yTicks = computed(() => {
  const max = chartMaxVal.value
  return [0, 0.33, 0.66, 1].map((frac) => {
    const val = max * frac
    return {
      y: valueToY(val),
      label: `${(val * 100).toFixed(1)}%`
    }
  })
})

const xTicks = computed(() => {
  const pts = chartPoints.value
  if (pts.length < 2) return []
  const first = pts[0]
  const mid = pts[Math.floor(pts.length / 2)]
  const last = pts[pts.length - 1]
  const ticks = [
    { x: first.x, label: formatShortDate(first.date), anchor: 'start' },
    { x: last.x, label: formatShortDate(last.date), anchor: 'end' }
  ]
  if (pts.length >= 5) {
    ticks.splice(1, 0, { x: mid.x, label: formatShortDate(mid.date), anchor: 'middle' })
  }
  return ticks
})

const activeChartPoint = computed(() =>
  hoveredPointIdx.value != null ? chartPoints.value[hoveredPointIdx.value] || null : null
)

// ─── Format Breakdown Strip ───
const formatBreakdown = computed(() => {
  const rows = metricsData.value?.series || []
  const map = new Map()
  for (const row of rows) {
    const key = row.type || 'OTHER'
    if (!map.has(key)) {
      map.set(key, { type: key, count: 0, rateSum: 0, rateCount: 0 })
    }
    const entry = map.get(key)
    entry.count += 1
    if (typeof row.interactionRate === 'number' && Number.isFinite(row.interactionRate)) {
      entry.rateSum += row.interactionRate
      entry.rateCount += 1
    }
  }
  return Array.from(map.values())
    .map((e) => ({
      type: e.type,
      count: e.count,
      avgRate: e.rateCount > 0 ? e.rateSum / e.rateCount : null
    }))
    .sort((a, b) => (b.avgRate ?? -1) - (a.avgRate ?? -1))
})

// ─── Table Sorting ───
const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

const sortedSeries = computed(() => {
  const rows = [...(metricsData.value?.series || [])]
  const mult = sortDir.value === 'asc' ? 1 : -1

  return rows.sort((a, b) => {
    if (sortKey.value === 'date') {
      return (new Date(a.date) - new Date(b.date)) * mult
    }
    if (sortKey.value === 'reach') {
      return ((a.reach ?? -1) - (b.reach ?? -1)) * mult
    }
    if (sortKey.value === 'interactionRate') {
      return ((a.interactionRate ?? -1) - (b.interactionRate ?? -1)) * mult
    }
    if (sortKey.value === 'percentile') {
      return (
        ((a.percentileComparison?.interactionRate ?? -1) -
          (b.percentileComparison?.interactionRate ?? -1)) *
        mult
      )
    }
    return 0
  })
})

// ─── Formatters & Semantic Badges ───
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatShortDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

const formatNumber = (num, decimals = 0) => {
  const numericValue = Number(num)
  if (!Number.isFinite(numericValue)) return '—'
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: decimals })
}

const formatPercent = (num) => {
  if (num == null) return '—'
  return `${(num * 100).toFixed(2)}%`
}

const formatTrend = (trend) => {
  if (trend == null) return '—'
  const sign = trend > 0 ? '+' : ''
  return `${sign}${(trend * 100).toFixed(1)}%`
}

const getVerdictBadgeClass = (growth) => {
  if (growth === 'POSITIVE') {
    return 'bg-status-positive-bg border-status-positive/30 text-status-positive'
  }
  if (growth === 'NEGATIVE') {
    return 'bg-status-negative-bg border-status-negative/30 text-status-negative'
  }
  return 'bg-status-warning-bg border-status-warning/30 text-status-warning'
}

const getBaselineBadgeClass = (performance) => {
  if (performance === 'ABOVE') {
    return 'bg-status-positive-bg border-status-positive/30 text-status-positive'
  }
  if (performance === 'BELOW') {
    return 'bg-status-negative-bg border-status-negative/30 text-status-negative'
  }
  return 'bg-status-warning-bg border-status-warning/30 text-status-warning'
}

const getBaselineSymbol = (performance) => {
  if (performance === 'ABOVE') return '▲'
  if (performance === 'BELOW') return '▼'
  return '•'
}

onMounted(fetchMetrics)
onUnmounted(() => activeRequestController?.abort())
watch(() => authStore.activeBrand, fetchMetrics)
watch(() => authStore.lastSyncTimestamp, fetchMetrics)
</script>