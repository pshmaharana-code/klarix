<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <div v-if="loading" class="text-gray-400 animate-pulse">Loading brands...</div>
    
    <div v-else-if="authStore.activeBrand">
      <h2 class="text-3xl font-bold mb-2">Welcome to {{ authStore.activeBrand.name }}</h2>
      <p class="text-gray-400">Phase 1 infrastructure is successfully running.</p>
      
      <div class="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
        <h3 class="text-lg font-medium text-white mb-4">Brand Details</h3>
        <ul class="space-y-2 text-sm text-gray-300">
          <li><strong class="text-gray-500">Positioning:</strong> {{ authStore.activeBrand.positioning || 'None' }}</li>
          <li>
            <strong class="text-gray-500">Status:</strong> 
            <span :class="{'text-yellow-400': authStore.activeBrand.onboardingStatus === 'PENDING', 'text-green-400': authStore.activeBrand.onboardingStatus === 'COMPLETED'}">
              {{ authStore.activeBrand.onboardingStatus }}
            </span>
          </li>
        </ul>
        
        <div v-if="authStore.activeBrand.onboardingStatus === 'PENDING'" class="mt-6 pt-6 border-t border-gray-700">
          <router-link to="/onboarding/connect" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Connect Social Account
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </router-link>
        </div>

        <div v-if="authStore.activeBrand.socialAccounts && authStore.activeBrand.socialAccounts.length > 0" class="mt-6 pt-6 border-t border-gray-700">
          <h4 class="text-md font-medium text-white mb-3">Connected Accounts</h4>
          <div v-for="account in authStore.activeBrand.socialAccounts" :key="account.id" class="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
            <div>
              <div class="font-medium text-white flex items-center gap-2">
                <span class="capitalize">{{ account.platform.toLowerCase() }}</span>
                <span class="text-gray-400 font-normal">@{{ account.username }}</span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Last synced: {{ account.lastSync ? new Date(account.lastSync).toLocaleString() : 'Never' }}
              </div>
            </div>
            
            <div>
              <button 
                v-if="!syncingAccount"
                @click="syncAccount(account)" 
                class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Sync Now
              </button>
              
              <div v-else-if="syncingAccount === account.id" class="flex items-center gap-2 text-blue-400 text-sm">
                <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing... ({{ syncProgress }}%)
              </div>
            </div>
          </div>
          
          <div v-if="syncError" class="mt-3 p-3 bg-red-900/50 border border-red-800 rounded text-red-200 text-sm">
            {{ syncError }}
          </div>
          <div v-if="syncSuccess" class="mt-3 p-3 bg-green-900/50 border border-green-800 rounded text-green-200 text-sm">
            Successfully synchronized account data. Check the Content section!
          </div>
        </div>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading = ref(true);
const creating = ref(false);
const newBrand = ref({ name: '', positioning: '' });

const syncingAccount = ref(null);
const syncProgress = ref(0);
const syncError = ref(null);
const syncSuccess = ref(false);
let pollInterval = null;

const fetchBrands = async () => {
  try {
    const res = await fetch('/api/v2/brands', {credentials: 'include'});
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
    const res = await fetch('/api/v2/brands', {
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

const syncAccount = async (account) => {
  if (syncingAccount.value) return;
  
  syncingAccount.value = account.id;
  syncProgress.value = 0;
  syncError.value = null;
  syncSuccess.value = false;
  
  const idempotencyKey = `sync-${account.id}-${Date.now()}`;
  
  try {
    const res = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/social-accounts/${account.id}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey }),
      credentials: 'include'
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || 'Failed to start sync');
    }
    
    const { data } = await res.json();
    startPolling(data.job.id, account.id);
  } catch (e) {
    console.error('Error starting sync:', e);
    syncError.value = e.message;
    syncingAccount.value = null;
  }
};

const startPolling = (jobId, accountId) => {
  stopPolling();
  
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/v2/brands/${authStore.activeBrand.id}/jobs/${jobId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Job status request failed');
      
      const { data } = await res.json();
      const job = data.job;
      
      syncProgress.value = job.progressPercent || 0;
      
      if (job.state === 'COMPLETED') {
        stopPolling();
        syncingAccount.value = null;
        syncSuccess.value = true;
        // Refetch the brand to get updated lastSync
        await fetchBrands();
        // Trigger a global event to update content UI
        authStore.triggerSyncUpdate();
        setTimeout(() => { syncSuccess.value = false; }, 5000);
      } else if (job.state === 'FAILED' || job.state === 'CANCELLED') {
        stopPolling();
        syncingAccount.value = null;
        syncError.value = job.error?.message || job.error?.code || 'Sync failed';
      }
    } catch (e) {
      console.error('Error polling job:', e);
      // Don't stop polling on single network error, might be transient
    }
  }, 2000);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

onMounted(() => {
  fetchBrands();
});

onUnmounted(() => {
  stopPolling();
});
</script>
