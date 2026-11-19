<template>
  <div class="w-full min-w-0 max-w-4xl mx-auto space-y-6 pb-20">
    <!-- Top Utility Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-hairline">
      <router-link
        :to="`/strategy/${strategyId}/ideas`"
        class="inline-flex items-center gap-2 klx-mono-label text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft class="w-3.5 h-3.5" :stroke-width="2" />
        <span>Back to Ideation Board</span>
      </router-link>

      <div v-if="script" class="flex flex-wrap items-center gap-2.5">
        <!-- Version Switcher (Shown when multiple script revisions exist) -->
        <select
          v-if="allScripts.length > 1"
          v-model="selectedScriptIndex"
          aria-label="Select script version"
          class="klx-input w-auto px-3 py-2 text-xs font-mono font-semibold uppercase"
        >
          <option v-for="(s, idx) in allScripts" :key="s.id || idx" :value="idx">
            Version {{ s.version || allScripts.length - idx }}
          </option>
        </select>
        <span
          v-else
          class="klx-badge bg-surface border border-border-hairline text-ink py-2 px-3"
        >
          VERSION {{ script.version || 1 }}
        </span>

        <!-- One-Click Copy for Notion (Clean Markdown) -->
        <button
          type="button"
          @click="copyScriptMarkdown"
          class="klx-btn-outline px-3.5 py-2 text-xs font-mono uppercase tracking-wider bg-surface"
        >
          <Check v-if="copied" class="w-3.5 h-3.5 text-status-positive" :stroke-width="2.25" />
          <Copy v-else class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span>{{ copied ? 'Copied for Notion' : 'Copy Markdown' }}</span>
        </button>

        <!-- Mark Published Action -->
        <button
          type="button"
          @click="publishScript"
          :disabled="publishing"
          class="klx-btn-volt px-4 py-2 text-xs font-mono uppercase tracking-wider"
        >
          <span v-if="publishing" class="klx-pulse-square !bg-ink"></span>
          <CheckCircle2 v-else class="w-3.5 h-3.5" :stroke-width="2" />
          <span>{{ publishing ? 'Archiving...' : 'Mark Published' }}</span>
        </button>
      </div>
    </div>

    <!-- Active Job Polling Banner -->
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

    <!-- Inline Error State -->
    <div
      v-if="error"
      role="alert"
      class="p-4 bg-status-negative-bg border border-status-negative/35 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-status-negative font-medium"
    >
      <div class="flex items-center gap-2.5">
        <AlertCircle class="w-4 h-4 shrink-0" :stroke-width="2" />
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        @click="loadScript(false)"
        class="klx-btn-outline px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-surface shrink-0 self-start sm:self-auto"
      >
        Retry
      </button>
    </div>

    <!-- Skeleton Loader -->
    <div v-if="loading && !script" class="space-y-5">
      <div class="klx-card p-6 sm:p-8 space-y-3">
        <div class="klx-skeleton h-3 w-40"></div>
        <div class="klx-skeleton h-8 w-full"></div>
        <div class="klx-skeleton h-6 w-2/3"></div>
      </div>
      <div class="klx-card p-6 sm:p-8 space-y-3">
        <div class="klx-skeleton h-3 w-32"></div>
        <div class="klx-skeleton h-32 w-full"></div>
      </div>
    </div>

    <!-- ===================================================================
         PRODUCTION SCRIPT SHEET
         =================================================================== -->
    <div v-else-if="script" class="space-y-5">
      <!-- Top Production Spec Strip -->
      <div class="klx-card px-5 py-3.5 bg-canvas flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="klx-mono-label text-ink">Production Script Sheet</span>
          <span
            v-if="script.voiceCheck"
            class="klx-badge bg-status-positive-bg border border-status-positive/30 text-status-positive"
          >
            VOICE: {{ script.voiceCheck }}
          </span>
        </div>
        <span class="klx-badge bg-surface border border-border-hairline text-ink">
          <Clock class="w-3 h-3" :stroke-width="2" />
          <span>{{ script.estimatedLength || script.estimatedDuration || 'Standard Length' }}</span>
        </span>
      </div>

      <!-- 01 / HOOK -->
      <section
        v-if="script.hook"
        class="klx-card p-6 sm:p-8 border-l-4 border-l-volt"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="klx-mono-label text-ink">01 / Hook (Critical Retention Window)</span>
          <span class="klx-badge bg-volt text-ink border border-ink">0:00 – 0:03</span>
        </div>
        <div class="font-display font-bold text-xl sm:text-2xl text-ink leading-snug whitespace-pre-wrap">
          {{ script.hook }}
        </div>
      </section>

      <!-- 02 / OPENING (Optional V2 Field) -->
      <section v-if="script.opening" class="klx-card p-6 sm:p-8">
        <div class="klx-mono-label text-ink-muted mb-3">02 / Opening Bridge</div>
        <div class="text-base text-ink leading-relaxed whitespace-pre-wrap">
          {{ script.opening }}
        </div>
      </section>

      <!-- 03 / BODY -->
      <section v-if="script.body" class="klx-card p-6 sm:p-8">
        <div class="klx-mono-label text-ink-muted mb-3">
          {{ script.opening ? '03' : '02' }} / Narrative Body
        </div>
        <div class="text-base text-ink leading-relaxed whitespace-pre-wrap">
          {{ script.body }}
        </div>
      </section>

      <!-- 04 / CALL TO ACTION -->
      <section
        v-if="script.cta"
        class="klx-card p-6 sm:p-8 border-l-4 border-l-ink bg-canvas/40"
      >
        <div class="klx-mono-label text-ink-muted mb-3">
          {{ script.opening ? '04' : '03' }} / Call to Action
        </div>
        <div class="font-display font-bold text-lg sm:text-xl text-ink leading-snug whitespace-pre-wrap">
          {{ script.cta }}
        </div>
      </section>

      <!-- TEXT OVERLAYS & B-ROLL / VISUAL DIRECTION -->
      <div
        v-if="
          (script.textOverlays && script.textOverlays.length) ||
          (script.bRollSuggestions && script.bRollSuggestions.length) ||
          script.visualDirection
        "
        class="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        <section
          v-if="script.textOverlays && script.textOverlays.length"
          class="klx-card p-6 space-y-3"
        >
          <div class="klx-mono-label text-ink pb-2.5 border-b border-border-hairline">
            On-Screen Text Overlays
          </div>
          <ul class="space-y-2 text-sm text-ink-secondary">
            <li
              v-for="(ov, idx) in script.textOverlays"
              :key="idx"
              class="flex items-start gap-2.5 leading-relaxed"
            >
              <span class="font-mono text-[10px] font-bold text-ink mt-1">0{{ idx + 1 }}</span>
              <span>{{ ov }}</span>
            </li>
          </ul>
        </section>

        <section
          v-if="(script.bRollSuggestions && script.bRollSuggestions.length) || script.visualDirection"
          class="klx-card p-6 space-y-3"
        >
          <div class="klx-mono-label text-ink pb-2.5 border-b border-border-hairline">
            Visual Direction &amp; B-Roll
          </div>
          <p v-if="script.visualDirection" class="text-sm text-ink-secondary leading-relaxed">
            {{ script.visualDirection }}
          </p>
          <ul v-if="script.bRollSuggestions?.length" class="space-y-2 text-sm text-ink-secondary">
            <li
              v-for="(broll, idx) in script.bRollSuggestions"
              :key="idx"
              class="flex items-start gap-2.5 leading-relaxed"
            >
              <span class="w-1.5 h-1.5 bg-volt border border-ink shrink-0 mt-2"></span>
              <span>{{ broll }}</span>
            </li>
          </ul>
        </section>
      </div>

      <!-- DELIVERY NOTES -->
      <section
        v-if="script.deliveryNotes"
        class="klx-card p-5 bg-canvas flex flex-col sm:flex-row sm:items-start gap-3"
      >
        <span class="klx-badge bg-surface border border-border-hairline text-ink shrink-0">
          DELIVERY NOTES
        </span>
        <p class="text-sm text-ink-secondary leading-relaxed">
          {{ script.deliveryNotes }}
        </p>
      </section>

      <!-- REFINEMENT ENGINE -->
      <section class="klx-card p-6 sm:p-8 border-border-strong space-y-4">
        <div>
          <div class="klx-mono-label text-volt-ink mb-1">Revision Control</div>
          <h2 class="font-display font-bold text-xl text-ink">Refine this Script</h2>
          <p class="mt-1 text-xs text-ink-secondary">
            Request a sharper hook, tighter pacing, or a different angle—Klarix will generate a new version while keeping your Brand Memory locked.
          </p>
        </div>

        <textarea
          v-model="feedbackInstruction"
          rows="3"
          placeholder="e.g. Make the hook sharper and trim the body to under 35 seconds."
          class="klx-input px-4 py-3 text-sm resize-none placeholder:text-ink-muted/70"
        ></textarea>

        <div class="flex justify-end">
          <button
            type="button"
            @click="regenerateScript"
            :disabled="generating || !feedbackInstruction.trim()"
            class="klx-btn-volt px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
          >
            <span v-if="generating" class="klx-pulse-square !bg-ink"></span>
            <RefreshCw v-else class="w-3.5 h-3.5" :stroke-width="2" />
            <span>{{ generating ? 'Synthesizing Revision...' : 'Regenerate Script' }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { strategyApi } from '../services/strategyApi'
import {
  ArrowLeft,
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Clock,
  RefreshCw
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const strategyId = route.params.strategyId
const ideaId = route.params.ideaId

const allScripts = ref([])
const selectedScriptIndex = ref(0)
const loading = ref(true)
const error = ref(null)

const feedbackInstruction = ref('')
const generating = ref(false)
const publishing = ref(false)
const copied = ref(false)
const jobMessage = ref('')
const jobState = ref(null)
let pollInterval = null

const script = computed(() => allScripts.value[selectedScriptIndex.value] || null)

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

const buildMarkdownExport = () => {
  if (!script.value) return ''
  const s = script.value
  const lines = [
    `# Production Script (Version ${s.version || 1})`,
    s.estimatedLength || s.estimatedDuration
      ? `**Estimated Length:** ${s.estimatedLength || s.estimatedDuration}`
      : null,
    '',
    s.hook ? `## 01 / HOOK\n${s.hook}\n` : null,
    s.opening ? `## 02 / OPENING\n${s.opening}\n` : null,
    s.body ? `## BODY\n${s.body}\n` : null,
    s.cta ? `## CALL TO ACTION\n${s.cta}\n` : null,
    s.textOverlays?.length
      ? `## TEXT OVERLAYS\n${s.textOverlays.map((ov) => `- ${ov}`).join('\n')}\n`
      : null,
    s.bRollSuggestions?.length
      ? `## B-ROLL & VISUALS\n${s.bRollSuggestions.map((b) => `- ${b}`).join('\n')}\n`
      : null,
    s.visualDirection ? `## VISUAL DIRECTION\n${s.visualDirection}\n` : null,
    s.deliveryNotes ? `## DELIVERY NOTES\n${s.deliveryNotes}\n` : null
  ]
  return lines.filter((l) => l !== null).join('\n').trim()
}

const copyScriptMarkdown = async () => {
  try {
    await navigator.clipboard.writeText(buildMarkdownExport())
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2200)
  } catch {
    error.value = 'Clipboard access denied by browser.'
  }
}

const publishScript = async () => {
  publishing.value = true
  error.value = null
  try {
    await strategyApi.updateIdeaStatus(ideaId, 'PUBLISHED')
    router.push(`/strategy/${strategyId}/ideas`)
  } catch (err) {
    error.value = `Failed to archive script: ${err.message || 'Unknown error'}`
    publishing.value = false
  }
}

const loadScript = async (isSilentRefresh = false) => {
  if (!isSilentRefresh) loading.value = true
  error.value = null

  const hasBrand = await ensureActiveBrand()
  if (!hasBrand) {
    loading.value = false
    return
  }

  try {
    const response = await strategyApi.getScripts(ideaId)
    const scripts = response.data?.scripts || []

    if (scripts.length > 0) {
      allScripts.value = scripts
      selectedScriptIndex.value = 0
    } else {
      triggerScriptGeneration()
    }
  } catch (err) {
    error.value = err.message || 'Failed to load the script.'
  } finally {
    loading.value = false
  }
}

const triggerScriptGeneration = async (instruction = null) => {
  generating.value = true
  jobState.value = 'QUEUED'
  jobMessage.value = instruction
    ? 'Synthesizing script refinements...'
    : 'Drafting initial production script...'
  error.value = null

  try {
    const res = await strategyApi.generateScript(ideaId, instruction)
    const jobId = res.data.job.id
    pollJob(jobId)
  } catch (err) {
    error.value = err.message || 'Failed to trigger script generation.'
    generating.value = false
    jobMessage.value = ''
    jobState.value = null
  }
}

const regenerateScript = () => {
  if (!feedbackInstruction.value.trim()) return
  triggerScriptGeneration(feedbackInstruction.value)
}

const pollJob = (jobId) => {
  stopPolling()

  pollInterval = setInterval(async () => {
    try {
      const res = await strategyApi.getJobStatus(authStore.activeBrand.id, jobId)
      const job = res.data.job

      jobState.value = job.state
      if (job.state === 'RETRY_PENDING') {
        jobMessage.value = 'High AI demand — automatically retrying script draft in ~30s...'
      }

      if (job.state === 'COMPLETED') {
        stopPolling()
        jobMessage.value = ''
        jobState.value = null
        generating.value = false
        feedbackInstruction.value = ''
        await loadScript(true)
      } else if (job.state === 'FAILED' || job.state === 'CANCELLED') {
        stopPolling()
        jobMessage.value = ''
        jobState.value = null
        generating.value = false
        error.value = job.error?.message || 'AI failed to generate the script.'
      }
    } catch (err) {
      console.error('Polling error', err)
    }
  }, 2000)
}

onMounted(() => loadScript(false))
onUnmounted(stopPolling)
</script>