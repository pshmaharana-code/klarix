<template>
  <div class="w-full min-w-0 max-w-5xl mx-auto space-y-8 pb-12">
    <router-link to="/patterns" class="text-sm text-indigo-300 hover:text-indigo-200">← Back to Patterns</router-link>

    <div v-if="loading" class="text-gray-400 animate-pulse bg-gray-900 p-8 rounded-xl border border-gray-800">
      Loading pattern evidence...
    </div>

    <div v-else-if="error" class="p-6 bg-red-900/50 border border-red-800 rounded-xl text-red-200">
      <h2 class="text-lg font-medium mb-2">Pattern unavailable</h2>
      <p>{{ error }}</p>
    </div>

    <template v-else-if="detail">
      
      <!-- The Control Gate Action Bar -->
      <div class="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div class="flex items-center gap-3">
          <span class="w-2 h-2 rounded-full" :class="isPromoted ? 'bg-emerald-400' : 'bg-indigo-400 animate-pulse'"></span>
          <div>
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">Strategic Governance</h3>
            <p class="text-xs text-indigo-200 mt-1">Approve this pattern to permanently inject it into the AI's core Brand Memory.</p>
          </div>
        </div>
        <button 
          @click="promotePattern" 
          :disabled="isPromoting || isPromoted"
          class="px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shrink-0 w-full sm:w-auto"
          :class="isPromoted 
            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800 cursor-default' 
            : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'"
        >
          <span v-if="isPromoting">Injecting Memory...</span>
          <span v-else-if="isPromoted">✓ Active in Brand Memory</span>
          <span v-else>Approve to Brand Memory →</span>
        </button>
      </div>

      <header class="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8">
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <span class="text-xs uppercase tracking-wide text-indigo-300">{{ detail.pattern.category }}</span>
            <h1 class="text-2xl md:text-3xl font-bold text-white mt-2">{{ detail.pattern.title }}</h1>
          </div>
          <div class="text-left md:text-right">
            <div class="text-xs text-gray-400">Confidence</div>
            <div class="text-2xl font-semibold text-emerald-300">{{ formatConfidence(detail.pattern.confidence) }}</div>
          </div>
        </div>
        <p class="text-gray-200 leading-relaxed mt-6 text-lg">{{ detail.pattern.claim }}</p>
        <p v-if="detail.pattern.recommendedAction" class="text-sm text-gray-400 mt-5 border-l-2 border-indigo-500 pl-4">
          Recommended action: {{ detail.pattern.recommendedAction }}
        </p>
      </header>

      <section class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div class="flex items-center justify-between gap-4 mb-5">
          <h2 class="text-lg font-semibold text-white">Why Klarix believes this</h2>
          <span class="text-sm text-gray-400">{{ detail.evidence.length }} evidence items</span>
        </div>
        <div class="space-y-3">
          <article v-for="item in detail.evidence" :key="item.id" class="border border-gray-800 rounded-lg p-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
              <router-link v-if="item.contentId" :to="`/content/${item.contentId}`" class="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                View supporting content
              </router-link>
              <span class="text-xs font-bold px-2 py-1 rounded bg-gray-800 text-gray-300">Contribution {{ formatContribution(item.contribution) }}</span>
            </div>
            <p class="text-gray-300 text-sm leading-relaxed">{{ item.summary }}</p>
          </article>
        </div>
      </section>

      <section v-if="detail.pattern.impact" class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Empirical Comparison</h2>
        <dl class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div class="p-4 rounded-lg bg-gray-950 border border-gray-800">
            <dt class="text-gray-500 uppercase tracking-wider text-[10px] font-bold">Qualified Sample</dt>
            <dd class="text-white mt-1 text-lg font-semibold">{{ detail.pattern.impact.sampleSize }}</dd>
          </div>
          <div class="p-4 rounded-lg bg-gray-950 border border-gray-800">
            <dt class="text-gray-500 uppercase tracking-wider text-[10px] font-bold">Top Cohort Avg</dt>
            <dd class="text-white mt-1 text-lg font-semibold">{{ formatPercent(detail.pattern.impact.topAverage) }}</dd>
          </div>
          <div class="p-4 rounded-lg bg-gray-950 border border-gray-800">
            <dt class="text-gray-500 uppercase tracking-wider text-[10px] font-bold">Baseline Cohort</dt>
            <dd class="text-white mt-1 text-lg font-semibold">{{ formatPercent(detail.pattern.impact.baselineAverage) }}</dd>
          </div>
          <div class="p-4 rounded-lg bg-indigo-900/20 border border-indigo-500/30">
            <dt class="text-indigo-300 uppercase tracking-wider text-[10px] font-bold">Relative Delta</dt>
            <dd class="text-indigo-100 mt-1 text-lg font-semibold">{{ formatPercent(detail.pattern.impact.relativeDelta) }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const loading = ref(true);
const error = ref(null);
const detail = ref(null);

const isPromoting = ref(false);
const isPromoted = ref(false);

const loadDetail = async () => {
  try {
    const response = await fetch(`/api/v2/patterns/${route.params.patternId}`, { credentials: 'include' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'Pattern not found');
    detail.value = payload.data;
  } catch (cause) {
    error.value = cause.message || 'Pattern not found';
  } finally {
    loading.value = false;
  }
};

const promotePattern = async () => {
  if (isPromoted.value || isPromoting.value) return;
  isPromoting.value = true;
  
  try {
    const response = await fetch(`/api/v2/patterns/${route.params.patternId}/promote`, { 
      method: 'POST',
      credentials: 'include' 
    });
    
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error?.message || 'Failed to promote pattern');
    }
    
    // Successfully injected into Brand Memory
    isPromoted.value = true;
  } catch (cause) {
    alert(`Promotion failed: ${cause.message}`);
  } finally {
    isPromoting.value = false;
  }
};

const formatConfidence = value => value == null ? 'Unavailable' : `${Number(value).toFixed(0)}%`;
const formatPercent = value => value == null ? 'Unavailable' : `${(Number(value) * 100).toFixed(2)}%`;
const formatContribution = value => value == null ? 'Unavailable' : `+${(Number(value) * 100).toFixed(1)}%`;

onMounted(loadDetail);
</script>