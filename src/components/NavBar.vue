<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="fixed top-0 w-full z-50 flex items-center justify-between px-8 py-6 bg-transparent">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white">
        K
      </div>
      <span class="text-xl font-bold tracking-tight text-white font-display">Klarix</span>
    </div>
    
    <RouterLink 
      to="/analyse" 
      class="px-5 py-2.5 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-colors"
    >
      Try Free &rarr;
    </RouterLink>
  </nav>
</template>
