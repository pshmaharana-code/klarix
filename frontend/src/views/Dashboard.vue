<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <div v-if="loading" class="text-gray-400 animate-pulse">Loading brands...</div>
    
    <div v-else-if="authStore.activeBrand">
      <h2 class="text-3xl font-bold mb-2">Welcome to {{ authStore.activeBrand.name }}</h2>
      <p class="text-gray-400">Phase 1 infrastructure is successfully running.</p>
      
      <div class="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
        <h3 class="text-lg font-medium text-white mb-4">Brand Details</h3>
        <ul class="space-y-2 text-sm text-gray-300">
          <li><strong class="text-gray-500">ID:</strong> {{ authStore.activeBrand.id }}</li>
          <li><strong class="text-gray-500">Positioning:</strong> {{ authStore.activeBrand.positioning || 'None' }}</li>
          <li><strong class="text-gray-500">Status:</strong> {{ authStore.activeBrand.onboardingStatus }}</li>
        </ul>
      </div>
    </div>
    
    <div v-else class="text-center py-20">
      <div class="w-16 h-16 bg-gray-800 rounded-full mx-auto flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
      </div>
      <h2 class="text-2xl font-bold mb-2">No Brand Selected</h2>
      <p class="text-gray-400 mb-6">Create a brand to begin your intelligence journey.</p>
      
      <form @submit.prevent="createBrand" class="max-w-md mx-auto text-left bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div class="mb-4">
          <label class="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Brand Name</label>
          <input v-model="newBrand.name" type="text" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" required />
        </div>
        <div class="mb-6">
          <label class="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Positioning</label>
          <input v-model="newBrand.positioning" type="text" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" />
        </div>
        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors" :disabled="creating">
          {{ creating ? 'Creating...' : 'Create Brand' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();
const loading = ref(true);
const creating = ref(false);
const newBrand = ref({ name: '', positioning: '' });

const fetchBrands = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/v2/brands', {credentials: 'include'});
    if (res.ok) {
      const { data } = await res.json();
      if (data.brands && data.brands.length > 0) {
        authStore.setActiveBrand(data.brands[0]);
      }
    }
  } catch (e) {
    console.error('Error fetching brands:', e);
  } finally {
    loading.value = false;
  }
};

const createBrand = async () => {
  creating.value = true;
  try {
    const res = await fetch('http://localhost:3001/api/v2/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBrand.value),
      credentials: 'include'
    });
    if (res.ok) {
      const { data } = await res.json();
      authStore.setActiveBrand(data.brand);
    }
  } catch (e) {
    console.error('Error creating brand:', e);
  } finally {
    creating.value = false;
  }
};

onMounted(() => {
  fetchBrands();
});
</script>
