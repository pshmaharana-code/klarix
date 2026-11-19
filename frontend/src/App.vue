<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppShell from './components/layout/AppShell.vue'

const route = useRoute()
const authStore = useAuthStore()

// Render the V2 Daylight workspace shell on protected routes; plain views on / and /login
const showWorkspaceShell = computed(
  () => Boolean(route.meta.requiresAuth) && authStore.isAuthenticated
)

// Never block public landing page render with an auth splash screen
const showInitSplash = computed(
  () => authStore.isInitializing && !route.meta.public
)

onMounted(() => {
  if (authStore.isInitializing) {
    authStore.checkSession()
  }
})
</script>

<template>
  <div
    v-if="showInitSplash"
    class="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas text-ink font-sans"
  >
    <div class="flex items-center gap-3">
      <img
        src="/brand/logo-volt.svg"
        alt="Klarix"
        class="w-7 h-7 rounded-[2px] border border-ink"
      />
      <span class="font-display font-extrabold text-xl tracking-tight">KLARIX</span>
    </div>
    <div class="flex items-center gap-2.5 text-ink-muted klx-mono-label">
      <span class="klx-pulse-square"></span>
      <span>Verifying Workspace Session</span>
    </div>
  </div>

  <div v-else class="min-h-screen bg-canvas text-ink font-sans">
    <AppShell v-if="showWorkspaceShell" />
    <router-view v-else />
  </div>
</template>