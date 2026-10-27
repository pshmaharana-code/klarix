<template>
  <div class="w-full min-w-0 max-w-4xl mx-auto space-y-8 pb-20">
    <!-- Header Navigation -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
      <div class="flex items-center space-x-4">
        <router-link :to="`/strategy/${strategyId}/ideas`" class="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>Back to Ideation Board</span>
        </router-link>
      </div>
      <div v-if="script" class="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400 uppercase tracking-wide">
        Script Version {{ script.version }}
      </div>
    </div>

    <!-- Active Job Polling Message -->
    <div v-if="jobMessage" class="p-4 bg-blue-900/30 border border-blue-800 rounded-xl flex items-center gap-4 text-blue-200 shadow-lg">
      <svg class="animate-spin w-5 h-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm font-medium">{{ jobMessage }}</span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="p-6 bg-red-900/50 border border-red-500/50 rounded-xl text-center">
      <p class="text-red-400">{{ error }}</p>
      <button @click="loadScript" class="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-white text-sm transition-colors">Try Again</button>
    </div>

    <!-- Skeleton Loader -->
    <div v-if="loading && !script" class="space-y-6 animate-pulse">
      <div class="h-32 bg-gray-900 rounded-2xl border border-gray-800"></div>
      <div class="h-48 bg-gray-900 rounded-2xl border border-gray-800"></div>
      <div class="h-32 bg-gray-900 rounded-2xl border border-gray-800"></div>
    </div>

    <!-- The Script Deck -->
    <div v-else-if="script" class="space-y-6">
      
      <!-- HOOK -->
      <div v-if="script.hook" class="p-6 sm:p-8 rounded-3xl bg-red-900/10 border border-red-900/50 shadow-sm relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
        <div class="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500"></span>
          HOOK (CRITICAL RETENTION WINDOW)
        </div>
        <div class="text-xl sm:text-2xl font-bold text-white leading-relaxed whitespace-pre-wrap">{{ script.hook }}</div>
      </div>

      <!-- BODY -->
      <div v-if="script.body" class="p-6 sm:p-8 rounded-3xl bg-gray-900 border border-gray-800 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">BODY (NARRATIVE ENGAGEMENT)</div>
        <div class="text-base sm:text-lg font-medium text-gray-300 leading-relaxed whitespace-pre-wrap">{{ script.body }}</div>
      </div>

      <!-- CTA -->
      <div v-if="script.cta" class="p-6 sm:p-8 rounded-3xl bg-blue-900/10 border border-blue-900/50 shadow-sm relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <div class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          CALL TO ACTION (CONVERSION ENGINE)
        </div>
        <div class="text-lg sm:text-xl font-bold text-white leading-relaxed whitespace-pre-wrap">{{ script.cta }}</div>
      </div>

      <!-- B-ROLL & OVERLAYS -->
      <div class="grid md:grid-cols-2 gap-6">
        <div v-if="script.textOverlays && script.textOverlays.length" class="p-6 rounded-2xl bg-gray-950 border border-gray-800">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">TEXT OVERLAYS</div>
          <ul class="list-disc list-inside text-sm text-gray-300 space-y-2">
            <li v-for="(ov, idx) in script.textOverlays" :key="idx" class="leading-relaxed">{{ ov }}</li>
          </ul>
        </div>

        <div v-if="script.bRollSuggestions && script.bRollSuggestions.length" class="p-6 rounded-2xl bg-gray-950 border border-gray-800">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">B-ROLL VISUALS</div>
          <ul class="list-disc list-inside text-sm text-gray-300 space-y-2">
            <li v-for="(broll, idx) in script.bRollSuggestions" :key="idx" class="leading-relaxed">{{ broll }}</li>
          </ul>
        </div>
      </div>

      <!-- NOTES & LENGTH -->
      <div class="p-5 rounded-2xl bg-gray-900 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <span class="text-sm text-gray-400"><strong class="text-gray-200">Delivery Notes:</strong> {{ script.deliveryNotes }}</span>
        <span class="font-bold text-xs shrink-0 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 uppercase tracking-widest">
          {{ script.estimatedLength || 'Unknown Length' }}
        </span>
      </div>

      <!-- REFINEMENT ENGINE -->
      <div class="mt-12 p-6 sm:p-8 bg-gray-900 border border-gray-700 rounded-3xl space-y-4 shadow-xl">
        <h3 class="text-lg font-bold text-white">Refine this Script</h3>
        <p class="text-sm text-gray-400">Want the hook to be punchier? Need it to be shorter? Give the AI feedback and generate a new version.</p>
        <textarea 
          v-model="feedbackInstruction"
          rows="3"
          placeholder="e.g. Make the hook more aggressive and shorten the body section."
          class="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none text-sm"
        ></textarea>
        <div class="flex justify-end">
          <button 
            @click="regenerateScript"
            :disabled="generating || !feedbackInstruction.trim()"
            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-white transition-colors"
          >
            Regenerate Script ⟳
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { strategyApi } from '../services/strategyApi';

const route = useRoute();
const authStore = useAuthStore();
const strategyId = route.params.strategyId;
const ideaId = route.params.ideaId;

const script = ref(null);
const loading = ref(true);
const error = ref(null);

const feedbackInstruction = ref('');
const generating = ref(false);
const jobMessage = ref('');
let pollInterval = null;

const ensureActiveBrand = async () => {
  if (authStore.activeBrand) return true;
  try {
    const res = await fetch('/api/v2/brands', { credentials: 'include' });
    const { data } = await res.json();
    if (data && data.brands && data.brands.length > 0) {
      authStore.setActiveBrand(data.brands[0]);
      return true;
    }
  } catch (e) {
    console.error("Failed to fetch brand context", e);
  }
  return false;
};

const loadScript = async (isSilentRefresh = false) => {
  if (!isSilentRefresh) loading.value = true;
  error.value = null;

  const hasBrand = await ensureActiveBrand();
  if (!hasBrand) return;

  try {
    const response = await strategyApi.getScripts(ideaId);
    
    // If we have scripts, grab the newest one (index 0)
    if (response.data.scripts && response.data.scripts.length > 0) {
      script.value = response.data.scripts[0];
    } else {
      // Auto-trigger the very first generation if no script exists
      triggerScriptGeneration();
    }
  } catch (err) {
    error.value = err.message || 'Failed to load the script.';
  } finally {
    loading.value = false;
  }
};

const triggerScriptGeneration = async (instruction = null) => {
  generating.value = true;
  jobMessage.value = instruction ? 'Synthesizing script refinements...' : 'Drafting initial production script...';
  error.value = null;

  try {
    const res = await strategyApi.generateScript(ideaId, instruction);
    const jobId = res.data.job.id;
    pollJob(jobId);
  } catch (err) {
    error.value = 'Failed to trigger script generation.';
    generating.value = false;
    jobMessage.value = '';
  }
};

const regenerateScript = () => {
  if (!feedbackInstruction.value.trim()) return;
  triggerScriptGeneration(feedbackInstruction.value);
};

const pollJob = (jobId) => {
  if (pollInterval) clearInterval(pollInterval);
  
  pollInterval = setInterval(async () => {
    try {
      const res = await strategyApi.getJobStatus(authStore.activeBrand.id, jobId);
      const job = res.data.job;

      if (job.state === 'COMPLETED') {
        clearInterval(pollInterval);
        jobMessage.value = '';
        generating.value = false;
        feedbackInstruction.value = ''; // Clear feedback box
        
        await loadScript(true); // Silently reload the script object
      } else if (job.state === 'FAILED') {
        clearInterval(pollInterval);
        jobMessage.value = '';
        generating.value = false;
        error.value = 'AI failed to generate the script.';
      }
    } catch (err) {
      console.error('Polling error', err);
    }
  }, 2000);
};

onMounted(() => {
  loadScript();
});
</script>