<template>
  <div class="min-h-screen flex flex-col md:flex-row bg-gray-900 text-white">
    <!-- Sidebar -->
    <aside class="w-full md:w-64 bg-gray-950 border-b md:border-b-0 md:border-r border-gray-800 flex md:flex-col flex-shrink-0">
      <div class="p-4 md:p-6 flex-shrink-0">
        <h1 class="text-2xl font-bold tracking-tighter text-white">
          Klarix <span class="text-xs align-top text-gray-500 font-normal ml-1">V2</span>
        </h1>
      </div>
      <nav class="flex-1 flex gap-2 px-4 pb-3 md:pb-0 md:block md:space-y-2 overflow-x-auto">
        <router-link 
          to="/dashboard" 
          class="block whitespace-nowrap px-4 py-2 rounded-lg transition-colors hover:bg-gray-800"
          active-class="bg-gray-800 text-white font-medium"
        >
          Dashboard
        </router-link>
        <router-link 
          to="/content" 
          class="block whitespace-nowrap px-4 py-2 rounded-lg transition-colors hover:bg-gray-800"
          active-class="bg-gray-800 text-white font-medium"
        >
          Content
        </router-link>
        <router-link 
          to="/analytics" 
          class="block whitespace-nowrap px-4 py-2 rounded-lg transition-colors hover:bg-gray-800"
          active-class="bg-gray-800 text-white font-medium"
        >
          Analytics
        </router-link>
        <router-link
          to="/patterns"
          class="block whitespace-nowrap px-4 py-2 rounded-lg transition-colors hover:bg-gray-800"
          active-class="bg-gray-800 text-white font-medium"
        >
          Patterns
        </router-link>
        <a href="#" class="block whitespace-nowrap px-4 py-2 rounded-lg text-gray-400 hover:text-gray-300 transition-colors pointer-events-none opacity-50">Strategy</a>
      </nav>
      <div class="p-4 border-t border-gray-800 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-400 truncate w-32">
            {{ authStore.user?.email }}
          </div>
          <button @click="logout" class="text-xs text-gray-500 hover:text-white transition-colors">
            Logout
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="min-w-0 flex-1 flex flex-col">
      <!-- Topbar -->
      <header class="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md flex items-center px-4 md:px-8 justify-between sticky top-0 z-10">
        <div class="text-sm font-medium text-gray-300">
          <span v-if="authStore.activeBrand">{{ authStore.activeBrand.name }}</span>
          <span v-else class="text-gray-500 italic">No Brand Selected</span>
        </div>
        <div class="text-xs text-gray-500">
          Phase 1 Environment
        </div>
      </header>

      <!-- Page Content -->
      <div class="flex-1 min-w-0 overflow-auto p-4 md:p-8">
        <router-view></router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const logout = async () => {
  try {
    const res = await fetch('/api/v2/auth/logout', { method: 'POST' });
    if (res.ok) {
      authStore.clearAuth();
      router.push('/login');
    }
  } catch (e) {
    console.error('Failed to logout', e);
  }
};
</script>
