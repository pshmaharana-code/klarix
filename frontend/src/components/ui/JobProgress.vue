<template>
  <div class="job-progress-container p-6 bg-white rounded-lg shadow-sm border border-gray-100">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900">Connection Status</h3>
      <span 
        class="px-3 py-1 rounded-full text-sm font-medium"
        :class="{
          'bg-yellow-100 text-yellow-800': ['CREATED', 'QUEUED'].includes(jobState),
          'bg-blue-100 text-blue-800': jobState === 'PROCESSING',
          'bg-green-100 text-green-800': jobState === 'COMPLETED',
          'bg-red-100 text-red-800': jobState === 'FAILED',
        }"
      >
        {{ jobState }}
      </span>
    </div>

    <!-- Progress Bar -->
    <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
      <div 
        class="h-2.5 rounded-full transition-all duration-500 ease-out"
        :class="{
          'bg-blue-600': jobState !== 'FAILED' && jobState !== 'COMPLETED',
          'bg-green-600': jobState === 'COMPLETED',
          'bg-red-600': jobState === 'FAILED'
        }"
        :style="{ width: `${progressPercent}%` }"
      ></div>
    </div>

    <div class="space-y-2">
      <div class="flex justify-between text-sm text-gray-600">
        <span class="font-medium">{{ progressStep || 'Initializing...' }}</span>
        <span>{{ progressPercent }}%</span>
      </div>
      <p class="text-sm text-gray-500">{{ progressMessage }}</p>
    </div>

    <!-- Error Display -->
    <div v-if="jobState === 'FAILED'" class="mt-4 p-4 bg-red-50 rounded border border-red-100">
      <p class="text-sm text-red-700">
        <strong>Error:</strong> {{ errorMessage || 'An unknown error occurred during connection.' }}
      </p>
      <button @click="$emit('retry')" class="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium transition-colors">
        Retry Connection
      </button>
    </div>

    <!-- Success Message -->
    <div v-if="jobState === 'COMPLETED'" class="mt-4 p-4 bg-green-50 rounded border border-green-100">
      <p class="text-sm text-green-700">
        Successfully linked to Instagram account: <strong>@{{ resultData?.username }}</strong>
      </p>
      <button @click="$emit('continue')" class="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium transition-colors">
        Continue to Dashboard
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  jobId: { type: String, required: true },
  brandId: { type: String, required: true }
})

const emit = defineEmits(['retry', 'continue'])

const jobState = ref('FETCHING')
const progressPercent = ref(0)
const progressStep = ref('')
const progressMessage = ref('')
const errorMessage = ref(null)
const resultData = ref(null)

let pollInterval = null

const fetchJobStatus = async () => {
  try {
    const response = await fetch(`/api/v2/brands/${props.brandId}/jobs/${props.jobId}`)
    const data = await response.json()

    if (data.success && data.data.job) {
      const job = data.data.job
      jobState.value = job.state
      progressPercent.value = job.progressPercent
      progressStep.value = job.progressStep
      progressMessage.value = job.progressMessage

      if (job.state === 'COMPLETED') {
        resultData.value = job.result
        stopPolling()
      } else if (job.state === 'FAILED') {
        errorMessage.value = job.error?.message || 'Failed processing job'
        stopPolling()
      }
    }
  } catch (err) {
    console.error('Error polling job:', err)
  }
}

const startPolling = () => {
  fetchJobStatus() // initial fetch
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
