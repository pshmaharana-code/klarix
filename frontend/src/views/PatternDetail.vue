<template>
  <div class="w-full min-w-0 max-w-5xl mx-auto space-y-6 pb-16">
    <!-- Top Breadcrumb -->
    <div class="flex items-center justify-between pb-4 border-b border-border-hairline">
      <router-link
        to="/patterns"
        class="inline-flex items-center gap-2 klx-mono-label text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft class="w-3.5 h-3.5" :stroke-width="2" />
        <span>Back to Patterns</span>
      </router-link>

      <span class="klx-mono-label text-ink-muted">PATTERN GOVERNANCE</span>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-5">
      <div class="klx-card p-5 flex items-center justify-between">
        <div class="space-y-2">
          <div class="klx-skeleton h-3 w-32"></div>
          <div class="klx-skeleton h-4 w-72"></div>
        </div>
        <div class="klx-skeleton h-10 w-48"></div>
      </div>
      <div class="klx-card p-8 space-y-4">
        <div class="klx-skeleton h-4 w-32"></div>
        <div class="klx-skeleton h-8 w-3/4"></div>
        <div class="klx-skeleton h-20 w-full"></div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      role="alert"
      class="klx-card p-10 border-status-negative/40 bg-status-negative-bg/40 text-center flex flex-col items-center"
    >
      <div class="w-12 h-12 bg-surface border border-status-negative/35 rounded-[2px] flex items-center justify-center mb-4">
        <AlertCircle class="w-5 h-5 text-status-negative" :stroke-width="2" />
      </div>
      <h2 class="font-display font-bold text-xl text-status-negative">Pattern unavailable</h2>
      <p class="mt-1.5 text-sm text-status-negative/90">{{ error }}</p>
      <router-link
        to="/patterns"
        class="mt-5 klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
      >
        Return to Patterns
      </router-link>
    </div>

    <!-- Populated Pattern Detail & Governance Workspace -->
    <template v-else-if="detail">
      <!-- PINNED TOP GOVERNANCE ACTION BAR -->
      <div
        class="sticky top-16 z-20 klx-card p-4 sm:p-5 border-border-strong flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        :class="isPromoted ? 'bg-surface' : 'bg-surface'"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-9 h-9 rounded-[2px] border flex items-center justify-center shrink-0 mt-0.5"
            :class="
              isPromoted
                ? 'bg-status-positive-bg border-status-positive/35 text-status-positive'
                : 'bg-volt border-ink text-ink'
            "
          >
            <CheckCircle2 v-if="isPromoted" class="w-4 h-4" :stroke-width="2.25" />
            <ShieldCheck v-else class="w-4 h-4" :stroke-width="2" />
          </div>

          <div>
            <div class="flex items-center gap-2">
              <span class="klx-mono-label text-ink">Strategic Governance</span>
              <span
                v-if="isPromoted"
                class="klx-badge bg-status-positive-bg text-status-positive"
              >
                LOCKED
              </span>
            </div>
            <p class="text-xs text-ink-secondary mt-1 leading-relaxed">
              <template v-if="isPromoted">
                Active inside Brand Memory. Future strategy blueprints and scripts inherit this rule automatically.
              </template>
              <template v-else>
                Approve this evidence-backed pattern to permanently lock it into your Brand Memory constitution.
              </template>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <router-link
            v-if="isPromoted"
            to="/memory"
            class="klx-btn-outline px-4 py-2.5 text-xs font-mono uppercase tracking-wider w-full sm:w-auto"
          >
            <Brain class="w-3.5 h-3.5" :stroke-width="1.75" />
            <span>View in Memory</span>
            <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
          </router-link>

          <button
            v-else
            type="button"
            @click="promotePattern"
            :disabled="isPromoting"
            class="klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider w-full sm:w-auto"
          >
            <span v-if="isPromoting" class="klx-pulse-square !bg-ink"></span>
            <span>{{ isPromoting ? 'Locking into Memory...' : 'Approve to Brand Memory' }}</span>
            <ArrowRight v-if="!isPromoting" class="w-3.5 h-3.5" :stroke-width="2" />
          </button>
        </div>
      </div>

      <!-- Inline Promotion Error Alert -->
      <div
        v-if="promoteError"
        role="alert"
        class="p-3.5 bg-status-negative-bg border border-status-negative/35 rounded-[2px] flex items-center gap-2.5 text-xs font-medium text-status-negative"
      >
        <AlertCircle class="w-4 h-4 shrink-0" :stroke-width="2" />
        <span>{{ promoteError }}</span>
      </div>

      <!-- PATTERN STATEMENT & RECOMMENDED ACTION -->
      <header class="klx-card p-6 sm:p-8 space-y-6">
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div class="space-y-3 max-w-3xl">
            <div class="flex flex-wrap items-center gap-2">
              <span class="klx-badge bg-canvas border border-border-strong text-ink">
                {{ formatCategoryLabel(detail.category) }}
              </span>
              <span class="klx-mono-label text-ink-muted">
                {{ detail.evidence?.length || 0 }} SUPPORTING POSTS
              </span>
            </div>

            <h1 class="font-display font-extrabold text-2xl sm:text-4xl tracking-[-0.03em] text-ink leading-tight">
              {{ detail.title || 'Discovered Pattern' }}
            </h1>
          </div>

          <!-- Confidence Readout Box -->
          <div class="p-4 bg-canvas border border-border-hairline rounded-[2px] min-w-[150px] shrink-0">
            <div class="klx-mono-label text-ink-muted">Confidence</div>
            <div class="mt-1 text-3xl font-bold klx-kpi text-ink">
              {{ formatConfidence(detail.confidence) }}
            </div>
            <div class="mt-2.5 w-full h-1.5 bg-surface-subtle overflow-hidden">
              <div
                class="h-full bg-ink"
                :style="{ width: `${clampConfidence(detail.confidence)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <p class="text-base sm:text-lg text-ink leading-relaxed">
          {{ detail.claim }}
        </p>

        <div
          v-if="detail.recommendedAction"
          class="p-4 bg-canvas border-l-2 border-volt border-y border-r border-border-hairline rounded-[2px]"
        >
          <div class="klx-mono-label text-ink-muted mb-1">Recommended Execution Rule</div>
          <p class="text-sm font-medium text-ink leading-relaxed">
            {{ detail.recommendedAction }}
          </p>
        </div>
      </header>

      <!-- EMPIRICAL COHORT DELTA STRIP -->
      <section v-if="detail.impact" class="klx-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="klx-mono-label text-ink">Empirical Cohort Comparison</h2>
          <span class="klx-mono-label text-ink-muted">TOP COHORT VS BASELINE</span>
        </div>

        <dl class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
            <dt class="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Qualified Sample
            </dt>
            <dd class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
              {{ detail.impact.sampleSize ?? '—' }}
            </dd>
          </div>

          <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
            <dt class="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Top Cohort Avg
            </dt>
            <dd class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
              {{ formatPercent(detail.impact.topAverage) }}
            </dd>
          </div>

          <div class="p-4 bg-canvas border border-border-hairline rounded-[2px]">
            <dt class="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Baseline Cohort
            </dt>
            <dd class="mt-1.5 text-2xl font-bold klx-kpi text-ink-secondary">
              {{ formatPercent(detail.impact.baselineAverage) }}
            </dd>
          </div>

          <div class="p-4 bg-volt-tint border border-ink rounded-[2px]">
            <dt class="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink">
              Relative Delta
            </dt>
            <dd class="mt-1.5 text-2xl font-bold klx-kpi text-ink">
              {{ formatSignedPercent(detail.impact.relativeDelta) }}
            </dd>
          </div>
        </dl>
      </section>

      <!-- SUPPORTING VISUAL PROOF STRIP -->
      <section class="klx-card overflow-hidden">
        <div class="px-6 py-4 bg-canvas border-b border-border-hairline flex items-center justify-between gap-4">
          <div>
            <h2 class="klx-mono-label text-ink">Supporting Visual Proof</h2>
            <p class="text-xs text-ink-secondary mt-0.5">
              Click any verified post to inspect its full AI diagnostics and metric snapshots.
            </p>
          </div>
          <span class="klx-badge bg-surface border border-border-hairline text-ink">
            {{ detail.evidence?.length || 0 }} ITEMS
          </span>
        </div>

        <div class="p-6 space-y-3 bg-surface">
          <article
            v-for="item in detail.evidence"
            :key="item.id"
            class="border border-border-hairline hover:border-border-strong rounded-[2px] p-4 bg-canvas/50 transition-colors flex flex-col sm:flex-row gap-4 items-start"
          >
            <!-- Clickable Supporting Post Thumbnail (Hydrated cleanly from /api/v2/content/:id) -->
            <router-link
              v-if="item.contentId"
              :to="`/content/${item.contentId}`"
              class="w-full sm:w-20 aspect-[4/5] sm:h-24 bg-surface-subtle border border-border-hairline rounded-[2px] overflow-hidden shrink-0 flex items-center justify-center group"
            >
              <img
                v-if="getEvidenceThumb(item)"
                :src="getEvidenceThumb(item)"
                alt="Supporting post thumbnail"
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <ImageOff v-else class="w-4 h-4 text-ink-muted" :stroke-width="1.75" />
            </router-link>

            <!-- Evidence Summary & Contribution Weight -->
            <div class="flex-1 min-w-0 space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span
                    v-if="evidenceMeta[item.contentId]?.type"
                    class="klx-badge bg-obsidian text-obsidian-ink"
                  >
                    {{ evidenceMeta[item.contentId].type }}
                  </span>
                  <span class="klx-badge bg-surface border border-border-hairline text-ink">
                    Contribution {{ formatContribution(item.contribution) }}
                  </span>
                </div>

                <router-link
                  v-if="item.contentId"
                  :to="`/content/${item.contentId}`"
                  class="inline-flex items-center gap-1 klx-mono-label text-ink hover:text-volt-ink transition-colors"
                >
                  <span>Inspect Post</span>
                  <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
                </router-link>
              </div>

              <p class="text-sm text-ink leading-relaxed">
                {{ item.summary }}
              </p>

              <p
                v-if="evidenceMeta[item.contentId]?.caption"
                class="text-xs text-ink-muted line-clamp-1"
              >
                Post: {{ evidenceMeta[item.contentId].caption }}
              </p>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Brain,
  ImageOff
} from 'lucide-vue-next'

const route = useRoute()
const loading = ref(true)
const error = ref(null)
const detail = ref(null)

const isPromoting = ref(false)
const isPromoted = ref(false)
const promoteError = ref(null)
const evidenceMeta = ref({})

const extractThumbFromContent = (contentObj) => {
  if (!contentObj?.media?.length) return null
  const media = contentObj.media[0]
  if (contentObj.type === 'VIDEO' || contentObj.type === 'REEL') {
    return media.thumbnailUrl || media.sourceUrl || null
  }
  return media.sourceUrl || media.thumbnailUrl || null
}

const hydrateEvidenceThumbnails = async (evidenceList = []) => {
  const uniqueIds = Array.from(
    new Set(evidenceList.map((e) => e.contentId).filter(Boolean))
  ).slice(0, 8)

  if (uniqueIds.length === 0) return

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const res = await fetch(`/api/v2/content/${id}`, { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        const item = json?.data
        if (!item) return
        evidenceMeta.value = {
          ...evidenceMeta.value,
          [id]: {
            thumb: extractThumbFromContent(item),
            type: item.type,
            caption: item.caption || ''
          }
        }
      } catch {
        // Non-blocking enrichment; ignore individual lookup failures
      }
    })
  )
}

const getEvidenceThumb = (item) => {
  if (item.thumbnailUrl) return item.thumbnailUrl
  if (item.contentId && evidenceMeta.value[item.contentId]?.thumb) {
    return evidenceMeta.value[item.contentId].thumb
  }
  return null
}

const loadDetail = async () => {
  loading.value = true
  error.value = null
  promoteError.value = null
  isPromoted.value = false
  evidenceMeta.value = {}

  try {
    const response = await fetch(`/api/v2/patterns/${route.params.patternId}`, {
      credentials: 'include'
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || 'Pattern not found.')

    detail.value = payload.data
    if (payload.data?.isPromoted) {
      isPromoted.value = true
    }

    // Lazily enrich supporting proof cards with real thumbnails
    hydrateEvidenceThumbnails(payload.data?.evidence || [])
  } catch (cause) {
    error.value = cause.message || 'Pattern not found.'
  } finally {
    loading.value = false
  }
}

const promotePattern = async () => {
  if (isPromoted.value || isPromoting.value) return
  isPromoting.value = true
  promoteError.value = null

  try {
    const response = await fetch(`/api/v2/patterns/${route.params.patternId}/promote`, {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error?.message || payload.message || 'Failed to promote pattern.')
    }

    isPromoted.value = true
  } catch (cause) {
    promoteError.value = cause.message || 'Promotion failed. Please try again.'
  } finally {
    isPromoting.value = false
  }
}

const clampConfidence = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, num <= 1 && num > 0 ? num * 100 : num))
}

const formatConfidence = (value) => (value == null ? '—' : `${clampConfidence(value).toFixed(0)}%`)
const formatPercent = (value) => (value == null ? '—' : `${(Number(value) * 100).toFixed(2)}%`)
const formatSignedPercent = (value) => {
  if (value == null) return '—'
  const num = Number(value) * 100
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(1)}%`
}
const formatContribution = (value) => {
  if (value == null) return '—'
  const num = Number(value) * 100
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(1)}%`
}
const formatCategoryLabel = (cat) => (cat ? String(cat).replace(/_/g, ' ') : 'SIGNAL')

onMounted(loadDetail)
watch(() => route.params.patternId, loadDetail)
</script>