<template>
  <div class="max-w-3xl mx-auto py-4 sm:py-8 space-y-6">
    <!-- Top Back Link -->
    <div class="flex items-center justify-between">
      <router-link
        to="/dashboard"
        class="inline-flex items-center gap-1.5 klx-mono-label text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Back to Command Center</span>
      </router-link>

      <span class="klx-mono-label text-ink-muted">META GRAPH OAUTH</span>
    </div>

    <!-- Main Architectural Container -->
    <div class="klx-card p-6 sm:p-8 space-y-8">
      <!-- Header -->
      <div class="pb-6 border-b border-border-hairline">
        <p class="klx-mono-label text-volt-ink mb-2">01 / Data Source Connection</p>
        <h1 class="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-ink">
          Connect Instagram Professional
        </h1>
        <p class="mt-2 text-sm text-ink-secondary leading-relaxed max-w-xl">
          Authorize read-only Meta Graph access so Klarix can ingest your post catalogue, measure real interaction velocity, and compute your account baselines.
        </p>
      </div>

      <!-- 3-Step Visual Connection Stepper -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Connection steps">
        <div
          v-for="step in connectionSteps"
          :key="step.num"
          class="p-3.5 border rounded-[2px] transition-colors"
          :class="
            currentStep === step.num
              ? 'bg-canvas border-border-strong'
              : currentStep > step.num
                ? 'bg-canvas border-border-hairline'
                : 'bg-surface border-border-hairline opacity-60'
          "
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="klx-mono-label text-ink-muted">0{{ step.num }}</span>
            <span
              class="w-2 h-2"
              :class="
                currentStep > step.num
                  ? 'bg-status-positive'
                  : currentStep === step.num
                    ? 'bg-volt border border-ink'
                    : 'bg-border-hairline'
              "
            ></span>
          </div>
          <div class="text-xs font-semibold text-ink">{{ step.label }}</div>
          <div class="mt-0.5 text-[11px] text-ink-muted">{{ step.caption }}</div>
        </div>
      </div>

      <!-- Inline Error Alert -->
      <div
        v-if="errorMsg"
        role="alert"
        class="p-4 bg-status-negative-bg border border-status-negative/35 rounded-[2px] flex items-start gap-2.5 text-sm text-status-negative font-medium"
      >
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
        <span>{{ errorMsg }}</span>
      </div>

      <!-- STEP 1: Initial Authorization State -->
      <div
        v-if="!activeJobId"
        class="p-8 sm:p-12 border border-dashed border-border-strong/35 bg-canvas rounded-[2px] flex flex-col items-center text-center"
      >
        <div class="w-14 h-14 bg-surface border border-border-strong rounded-[2px] flex items-center justify-center mb-6">
          <svg class="w-7 h-7 text-ink" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
              clip-rule="evenodd"
            />
          </svg>
        </div>

        <button
          type="button"
          @click="initiateConnection"
          :disabled="isStarting"
          class="klx-btn-volt px-7 py-3.5 text-xs font-mono uppercase tracking-wider"
        >
          <span v-if="isStarting" class="klx-pulse-square !bg-ink"></span>
          <span>{{ isStarting ? 'Preparing Meta Handshake...' : 'Authorize Instagram Professional' }}</span>
          <ArrowRight v-if="!isStarting" class="w-4 h-4" :stroke-width="2" />
        </button>

        <div class="mt-5 flex items-center gap-2 text-xs text-ink-muted">
          <ShieldCheck class="w-4 h-4 text-ink shrink-0" :stroke-width="1.75" />
          <span>Read-only analytics access. Klarix never posts or modifies your Instagram account.</span>
        </div>
      </div>

      <!-- STEP 2 & 3: Durable Job Polling -->
      <div v-else>
        <JobProgress
          :jobId="activeJobId"
          :brandId="recoveredBrandId"
          @status-change="handleJobStatusChange"
          @retry="handleRetry"
          @continue="handleContinue"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import JobProgress from '../components/ui/JobProgress.vue'
import { ArrowLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isStarting = ref(false)
const activeJobId = ref(null)
const recoveredBrandId = ref(null)
const errorMsg = ref(null)
const liveJobState = ref(null)
const liveProgress = ref(0)

const connectionSteps = [
  { num: 1, label: 'Authorize Meta', caption: 'Grant read-only OAuth scope' },
  { num: 2, label: 'Ingest Catalogue', caption: 'Pull Reels, posts & metrics' },
  { num: 3, label: 'Compute Baselines', caption: 'Lock historical velocity' }
]

const currentStep = computed(() => {
  if (!activeJobId.value) return 1
  if (liveJobState.value === 'COMPLETED') return 4
  if (liveProgress.value >= 65) return 3
  return 2
})

const handleJobStatusChange = ({ state, progress }) => {
  liveJobState.value = state
  liveProgress.value = progress || 0
}

onMounted(() => {
  if (route.query.code) {
    startSyncJob(route.query.code)
  }
})

const initiateConnection = async () => {
  isStarting.value = true
  errorMsg.value = null

  try {
    let brandId = authStore.activeBrand?.id

    if (!brandId) {
      const bRes = await fetch('/api/v2/brands', { credentials: 'include' })
      if (bRes.ok) {
        const bData = await bRes.json()
        if (bData.data?.brands?.length > 0) {
          brandId = bData.data.brands[0].id
          authStore.setActiveBrand(bData.data.brands[0])
        }
      }
    }

    if (!brandId) {
      throw new Error('Workspace not initialized. Please create a brand entity on the Command Center first.')
    }

    const res = await fetch(`/api/v2/brands/${brandId}/social-accounts/instagram/auth-url`, {
      credentials: 'include'
    })
    const data = await res.json()

    if (data.success && data.data?.url) {
      window.location.href = data.data.url
    } else {
      throw new Error(data.message || data.error || 'Failed to generate secure authorization URL.')
    }
  } catch (err) {
    console.error(err)
    errorMsg.value = err.message
    isStarting.value = false
  }
}

const startSyncJob = async (oauthCode) => {
  errorMsg.value = null

  try {
    let brandId = authStore.activeBrand?.id

    // Recover workspace context if external Meta redirect cleared Vue memory
    if (!brandId) {
      const bRes = await fetch('/api/v2/brands', { credentials: 'include' })
      const bData = await bRes.json()
      if (bData.data?.brands?.length > 0) {
        brandId = bData.data.brands[0].id
        authStore.setActiveBrand(bData.data.brands[0])
      } else {
        throw new Error('Could not recover workspace context. Please return to the Command Center.')
      }
    }

    recoveredBrandId.value = brandId
    const state = route.query.state
    const idempotencyKey = crypto.randomUUID()

    const res = await fetch(`/api/v2/brands/${brandId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey,
        code: oauthCode,
        state
      }),
      credentials: 'include'
    })

    const data = await res.json()
    if (res.status === 202 && data.success) {
      activeJobId.value = data.data.job.id
      router.replace({ query: {} })
    } else {
      throw new Error(data.message || data.error || 'Failed to initialize synchronization pipeline.')
    }
  } catch (err) {
    console.error(err)
    errorMsg.value = err.message
    activeJobId.value = null
  }
}

const handleRetry = () => {
  activeJobId.value = null
  liveJobState.value = null
  liveProgress.value = 0
  initiateConnection()
}

const handleContinue = () => {
  router.push('/dashboard')
}
</script>