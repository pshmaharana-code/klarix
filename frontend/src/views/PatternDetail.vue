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
        <p class="text-gray-200 leading-relaxed mt-6">{{ detail.pattern.claim }}</p>
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
              <router-link v-if="item.contentId" :to="`/content/${item.contentId}`" class="text-sm text-indigo-300 hover:text-indigo-200">
                View supporting content
              </router-link>
              <span class="text-xs text-gray-500">Contribution {{ formatContribution(item.contribution) }}</span>
            </div>
            <p class="text-gray-300 text-sm leading-relaxed">{{ item.summary }}</p>
          </article>
        </div>
      </section>

      <section v-if="detail.pattern.impact" class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Comparison</h2>
        <dl class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt class="text-gray-500">Qualified sample</dt>
            <dd class="text-white mt-1">{{ detail.pattern.impact.sampleSize }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Top cohort</dt>
            <dd class="text-white mt-1">{{ formatPercent(detail.pattern.impact.topAverage) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Baseline cohort</dt>
            <dd class="text-white mt-1">{{ formatPercent(detail.pattern.impact.baselineAverage) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Relative difference</dt>
            <dd class="text-white mt-1">{{ formatPercent(detail.pattern.impact.relativeDelta) }}</dd>
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

const formatConfidence = value => value == null ? 'Unavailable' : `${Number(value).toFixed(0)}%`;
const formatPercent = value => value == null ? 'Unavailable' : `${(Number(value) * 100).toFixed(2)}%`;
const formatContribution = value => value == null ? 'Unavailable' : `${(Number(value) * 100).toFixed(2)}% above baseline`;

onMounted(loadDetail);
</script>
