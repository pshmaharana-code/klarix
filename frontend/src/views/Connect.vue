<template>
  <div class="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Connect Instagram</h2>
      <p class="text-gray-600 mb-8">
        Link your professional Instagram account to begin building your brand's intelligence.
      </p>

      <!-- Step 1: Initial State (Not Connected, Not Processing) -->
      <div v-if="!activeJobId" class="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div class="mb-4 p-4 bg-pink-100 text-pink-600 rounded-full">
          <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fill-rule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clip-rule="evenodd" />
          </svg>
        </div>
        <button
          @click="initiateConnection"
          :disabled="isStarting"
          class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
        >
          <span v-if="isStarting">Preparing...</span>
          <span v-else>Connect Instagram Professional</span>
        </button>
        <p class="mt-3 text-xs text-gray-500">You will be redirected to Facebook to authorize Klarix.</p>
      </div>

      <!-- Step 2: Processing (Polling the durable job) -->
      <div v-else>
        <JobProgress 
          :jobId="activeJobId" 
          :brandId="authStore.currentBrand?.id"
          @retry="handleRetry"
          @continue="handleContinue"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import JobProgress from '../components/ui/JobProgress.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isStarting = ref(false)
const activeJobId = ref(null)

// When the component mounts, check if we're returning from the OAuth flow
onMounted(() => {
  if (route.query.code) {
    // 1. We just came back from the Meta OAuth screen
    // 2. We need to submit this code to the backend to create the sync job
    startSyncJob(route.query.code)
  }
})

const initiateConnection = async () => {
  isStarting.value = true
  try {
    const brandId = authStore.currentBrand?.id
    if (!brandId) throw new Error('No brand selected')

    // Fetch the mock OAuth URL from our backend
    const res = await fetch(`/api/v2/brands/${brandId}/social-accounts/instagram/auth-url`)
    const data = await res.json()
    
    if (data.success && data.data.url) {
      // Redirect to the mock Meta authorization page
      window.location.href = data.data.url
    } else {
      throw new Error('Failed to generate auth URL')
    }
  } catch (err) {
    console.error(err)
    alert(err.message)
    isStarting.value = false
  }
}

const startSyncJob = async (oauthCode) => {
  try {
    const brandId = authStore.currentBrand?.id
    if (!brandId) return

    // This must match the idempotency contract
    const idempotencyKey = `sync-meta-${Date.now()}`

    const res = await fetch(`/api/v2/brands/${brandId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey,
        code: oauthCode
      })
    })

    const data = await res.json()
    if (res.status === 202 && data.success) {
      // Backend successfully queued the job
      activeJobId.value = data.data.job.id
      
      // Clean up the URL so refreshing doesn't re-submit the same code
      router.replace({ query: {} })
    } else {
      throw new Error(data.error || 'Failed to start sync')
    }
  } catch (err) {
    console.error(err)
    alert(err.message)
    activeJobId.value = null
  }
}

const handleRetry = () => {
  activeJobId.value = null
  isStarting.value = false
}

const handleContinue = () => {
  router.push('/dashboard')
}
</script>
