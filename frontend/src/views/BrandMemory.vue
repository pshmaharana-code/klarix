<template>
  <div class="w-full min-w-0 max-w-5xl mx-auto space-y-8 pb-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
      <div>
        <h1 class="text-2xl font-bold text-white">Brand Memory</h1>
        <p class="text-sm text-gray-400 mt-1">The active strategic constitution governing your AI generation engine.</p>
      </div>
    </div>

    <!-- States -->
    <div v-if="loading" class="space-y-4 animate-pulse">
      <div v-for="i in 3" :key="i" class="h-24 bg-gray-900 rounded-xl border border-gray-800"></div>
    </div>

    <div v-else-if="error" class="p-6 bg-red-900/50 border border-red-800 rounded-xl text-red-200">
      <p>{{ error }}</p>
      <button @click="loadMemories" class="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-white text-sm">Try Again</button>
    </div>

    <div v-else-if="memories.length === 0" class="bg-gray-900/50 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
      <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">No Active Memories</h3>
      <p class="text-gray-400">Your brand constitution is currently empty. Approve patterns from the analytics engine to build your strategy.</p>
      <router-link to="/patterns" class="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm font-bold transition-colors">
        Discover Patterns →
      </router-link>
    </div>

    <!-- Memory List -->
    <div v-else class="space-y-4">
      <div 
        v-for="memory in memories" 
        :key="memory.id" 
        class="bg-gray-900 border border-gray-800 rounded-xl p-5 md:p-6 flex flex-col md:flex-row gap-5 justify-between md:items-center hover:border-gray-700 transition-colors shadow-sm"
      >
        <div class="space-y-3 flex-1">
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
              {{ memory.domain }}
            </span>
            <span class="text-xs text-gray-500 font-medium">Added {{ formatDate(memory.createdAt) }}</span>
          </div>
          <p class="text-gray-200 leading-relaxed text-sm md:text-base pr-4">{{ memory.statement }}</p>
        </div>
        
        <button
          @click="revokeMemory(memory.id)"
          :disabled="revokingId === memory.id"
          class="shrink-0 px-4 py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 w-full md:w-auto"
        >
          {{ revokingId === memory.id ? 'Revoking...' : 'Revoke Rule ✕' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const memories = ref([]);
const loading = ref(true);
const error = ref(null);
const revokingId = ref(null);

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

const loadMemories = async () => {
  loading.value = true;
  error.value = null;

  const hasBrand = await ensureActiveBrand();
  if (!hasBrand) {
    error.value = "Active brand not found.";
    loading.value = false;
    return;
  }

  try {
    const response = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/memory`, { credentials: 'include' });
    const payload = await response.json();
    
    if (!response.ok) throw new Error(payload.error?.message || 'Failed to fetch brand memory');
    
    memories.value = payload.data.memories;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const revokeMemory = async (memoryId) => {
  if (!confirm("Are you sure you want to revoke this strategic rule? The AI will no longer use this context.")) return;
  
  revokingId.value = memoryId;
  
  try {
    const response = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/memory/${memoryId}`, { 
      method: 'DELETE',
      credentials: 'include' 
    });
    
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error?.message || 'Failed to revoke memory');
    }
    
    // Optimistically remove from UI
    memories.value = memories.value.filter(m => m.id !== memoryId);
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    revokingId.value = null;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown Date';
  return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

onMounted(loadMemories);
</script>