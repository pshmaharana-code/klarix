<template>
  <div class="w-full min-w-0 max-w-6xl mx-auto space-y-8 pb-12">
    <!-- Header Navigation -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
      <div class="flex items-center space-x-4">
        <router-link to="/strategy" class="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>Back to Strategy</span>
        </router-link>
      </div>
      <div v-if="!loading && ideas.length > 0" class="text-sm text-gray-400">
        Review draft concepts before generating final scripts.
      </div>
      <div v-else-if="!loading && ideas.length === 0" class="text-sm text-emerald-400 font-medium">
        Inbox Zero. All content ideas processed.
      </div>
    </div>

    <!-- Active Job Polling Message (For Discard & Replace) -->
    <div v-if="jobMessage" class="p-4 bg-blue-900/30 border border-blue-800 rounded-xl flex items-center gap-4 text-blue-200">
      <svg class="animate-spin w-5 h-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm font-medium">{{ jobMessage }}</span>
    </div>

    <!-- States -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="bg-gray-900 rounded-xl border border-gray-800 h-64 animate-pulse"></div>
    </div>

    <div v-else-if="error" class="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-center">
      <p class="text-red-400">{{ error }}</p>
      <button @click="loadIdeas" class="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-white text-sm transition-colors">Try Again</button>
    </div>

    <div v-else-if="ideas.length === 0" class="bg-gray-900/50 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
      <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">All Caught Up</h3>
      <p class="text-gray-400">You have published or processed all current ideas. Generate a new strategy to populate this board.</p>
    </div>

    <!-- The Ideas Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div 
        v-for="idea in ideas" 
        :key="idea.id"
        class="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col overflow-hidden hover:border-gray-700 transition-colors shadow-sm"
      >
        <!-- Card Header (Pillar & Format) -->
        <div class="p-6 border-b border-gray-800 bg-gray-950/50 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
              {{ idea.format }}
            </span>
            <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {{ idea.status }}
            </span>
          </div>
          <h3 class="text-lg font-bold text-white leading-snug">{{ idea.title }}</h3>
          <p class="text-xs text-gray-400 font-medium tracking-wide">Pillar: <span class="text-gray-300">{{ idea.pillar }}</span></p>
        </div>

        <!-- Card Body (Hook & Rationale) -->
        <div class="p-6 flex-1 space-y-5">
          <div>
            <span class="text-[10px] uppercase font-bold text-blue-400 tracking-wider block mb-1">Proposed Hook</span>
            <p class="text-sm text-gray-200 italic border-l-2 border-blue-500 pl-3 leading-relaxed">"{{ idea.hook }}"</p>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">Strategic Rationale</span>
            <p class="text-sm text-gray-400 leading-relaxed">{{ idea.rationale }}</p>
          </div>
        </div>

        <!-- Card Actions (The Control Gates) -->
        <div class="p-4 border-t border-gray-800 bg-gray-950/50 flex items-center justify-between gap-3">
          <button 
            @click="discardIdea(idea.id)"
            :disabled="generatingIdea"
            class="px-4 py-2 text-xs font-bold text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-1 text-center disabled:opacity-50"
          >
            Discard & Replace
          </button>
          <router-link 
            :to="`/strategy/${strategyId}/ideas/${idea.id}/script`"
            class="px-4 py-2 text-xs font-bold bg-white text-black hover:bg-gray-200 rounded-lg transition-colors flex-1 text-center shadow-sm flex items-center justify-center"
          >
            Write Script →
          </router-link>
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

const ideas = ref([]);
const loading = ref(true);
const error = ref(null);

const generatingIdea = ref(false);
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

const loadIdeas = async () => {
  loading.value = true;
  error.value = null;

  const hasBrand = await ensureActiveBrand();
  if (!hasBrand) {
    loading.value = false;
    return;
  }

  try {
    const response = await strategyApi.getIdeas(authStore.activeBrand.id, strategyId);
    // ONLY show ideas that are still in DRAFT mode
    ideas.value = response.data.ideas.filter(idea => idea.status === 'DRAFT');
  } catch (err) {
    error.value = err.message || 'Failed to load content ideas.';
  } finally {
    loading.value = false;
  }
};

const discardIdea = async (ideaId) => {
  const hasBrand = await ensureActiveBrand();
  if (!hasBrand) return;
  
  // Optimistically remove the idea from the UI
  ideas.value = ideas.value.filter(i => i.id !== ideaId);
  generatingIdea.value = true;
  jobMessage.value = 'Discarding concept and generating a targeted replacement...';

  try {
    // 1. Actually delete it from the database first
    await strategyApi.deleteIdea(ideaId);

    // 2. Generate exactly 1 new idea
    const res = await strategyApi.generateIdeas(authStore.activeBrand.id, strategyId, 1);
    const jobId = res.data.job.id;
    pollReplacementJob(jobId);
  } catch (err) {
    error.value = 'Failed to discard and replace idea.';
    generatingIdea.value = false;
    jobMessage.value = '';
    loadIdeas(); // Reload to sync with DB if it failed
  }
};

const pollReplacementJob = (jobId) => {
  if (pollInterval) clearInterval(pollInterval);
  
  pollInterval = setInterval(async () => {
    try {
      const res = await strategyApi.getJobStatus(authStore.activeBrand.id, jobId);
      const job = res.data.job;

      if (job.state === 'COMPLETED') {
        clearInterval(pollInterval);
        jobMessage.value = '';
        generatingIdea.value = false;
        
        const updatedResponse = await strategyApi.getIdeas(authStore.activeBrand.id, strategyId);
        // Ensure new ideas are also filtered down to just DRAFTS
        ideas.value = updatedResponse.data.ideas.filter(idea => idea.status === 'DRAFT');
      } else if (job.state === 'FAILED') {
        clearInterval(pollInterval);
        jobMessage.value = '';
        generatingIdea.value = false;
        error.value = 'AI failed to generate a replacement idea.';
      }
    } catch (err) {
      console.error('Polling error', err);
    }
  }, 2000);
};

onMounted(() => {
  loadIdeas();
});
</script>