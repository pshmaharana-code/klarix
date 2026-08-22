<template>
  <div class="min-h-screen flex bg-gray-900 text-white">
    <!-- Sidebar -->
    <aside class="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
      <div class="p-6">
        <h1 class="text-2xl font-bold tracking-tighter text-white">
          Klarix <span class="text-xs align-top text-gray-500 font-normal ml-1">V2</span>
        </h1>
      </div>
      <nav class="flex-1 px-4 space-y-2">
        <router-link 
          to="/dashboard" 
          class="block px-4 py-2 rounded-lg transition-colors hover:bg-gray-800"
          active-class="bg-gray-800 text-white font-medium"
        >
          Dashboard
        </router-link>
        <!-- Placeholders for future phases -->
        <a href="#" class="block px-4 py-2 rounded-lg text-gray-400 hover:text-gray-300 transition-colors pointer-events-none opacity-50">Content</a>
        <a href="#" class="block px-4 py-2 rounded-lg text-gray-400 hover:text-gray-300 transition-colors pointer-events-none opacity-50">Analytics</a>
        <a href="#" class="block px-4 py-2 rounded-lg text-gray-400 hover:text-gray-300 transition-colors pointer-events-none opacity-50">Patterns</a>
        <a href="#" class="block px-4 py-2 rounded-lg text-gray-400 hover:text-gray-300 transition-colors pointer-events-none opacity-50">Strategy</a>
      </nav>
      <div class="p-4 border-t border-gray-800">
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
    <main class="flex-1 flex flex-col">
      <!-- Topbar -->
      <header class="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md flex items-center px-8 justify-between sticky top-0 z-10">
        <div class="text-sm font-medium text-gray-300">
          <span v-if="authStore.activeBrand">{{ authStore.activeBrand.name }}</span>
          <span v-else class="text-gray-500 italic">No Brand Selected</span>
        </div>
        <div class="text-xs text-gray-500">
          Phase 1 Environment
        </div>
      </header>

      <!-- Page Content -->
      <div class="flex-1 overflow-auto p-8">
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
    const res = await fetch('http://localhost:3001/api/v2/auth/logout', { method: 'POST' });
    if (res.ok) {
      authStore.clearAuth();
      router.push('/login');
    }
  } catch (e) {
    console.error('Failed to logout', e);
  }
};
</script>
