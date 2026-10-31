<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppShell from './components/layout/AppShell.vue'

const route = useRoute()
const authStore = useAuthStore()

// Render the V2 workspace shell on protected routes, and plain view on /login
const showWorkspaceShell = computed(() => Boolean(route.meta.requiresAuth) && authStore.isAuthenticated)

onMounted(async () => {
  if (authStore.isInitializing) {
    await authStore.checkSession()
  }
})
</script>

<template>
  <div
    v-if="authStore.isInitializing"
    class="min-h-screen flex items-center justify-center bg-gray-950 text-white font-sans"
  >
    <div class="animate-pulse font-medium tracking-wide text-gray-400">
      Initializing Klarix V2...
    </div>
  </div>

  <div v-else class="min-h-screen bg-gray-950 text-white font-sans">
    <AppShell v-if="showWorkspaceShell" />
    <router-view v-else />
  </div>
</template>