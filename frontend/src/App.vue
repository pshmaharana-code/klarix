<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppShell from './components/layout/AppShell.vue'

const route = useRoute()
const authStore = useAuthStore()
const isV2App = computed(() => route.meta.requiresAuth)

onMounted(async () => {
  await authStore.checkSession();
})
</script>

<template>
  <div v-if="authStore.isInitializing" class="min-h-screen flex items-center justify-center bg-gray-950 text-white">
    <div class="animate-pulse font-medium tracking-wide">Initializing Klarix...</div>
  </div>
  <template v-else>
    <AppShell v-if="isV2App" />
    <div v-else class="min-h-screen bg-[#FAFAF9] text-[#0A0A0A]">
      <router-view />
    </div>
  </template>
</template>

<style>
/* Base overrides for light theme */
</style>
