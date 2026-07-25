<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const isLoaded = ref(false)
onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 80)
})
</script>

<template>
  <div 
    class="fixed top-0 w-full z-50 flex justify-center pt-6 px-4 pointer-events-none transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
    :class="isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-28 opacity-0'"
  >
    <nav 
      class="flex items-center justify-between w-full max-w-6xl px-6 py-3.5 rounded-full backdrop-blur-xl border pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.2),_inset_0_0_25px_rgba(99,102,241,0.4),_inset_0_0_10px_rgba(168,85,247,0.35)] hover:border-indigo-500/50 transition-all duration-500 ease-out"
      style="background-color: var(--navbar-bg, rgba(255, 255, 255, 0.82)); border-color: var(--card-border, rgba(226, 232, 240, 0.8));"
    >
      <!-- Logo & Brand Text -->
      <RouterLink to="/" class="flex items-center gap-2.5">
        <img src="/brand_logo.jpeg" alt="Klarix Logo" class="h-8 w-auto object-contain rounded-lg shadow-sm" />
        <span class="font-display font-bold text-xl tracking-[-0.035em] transition-colors duration-300" style="color: var(--text-primary, #0F172A);">Klarix</span>
      </RouterLink>
      
      <!-- Central Architectural Navigation Links -->
      <div class="hidden md:flex items-center gap-7 lg:gap-9 text-sm font-semibold tracking-tight">
        <a 
          href="#why-klarix" 
          class="relative py-1 transition-colors duration-200 hover:text-indigo-500 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-indigo-500 hover:after:w-full after:transition-all after:duration-300"
          style="color: var(--text-primary, #0F172A);"
        >Why Klarix</a>
        <a 
          href="#how-it-works" 
          class="relative py-1 transition-colors duration-200 hover:text-indigo-500 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-indigo-500 hover:after:w-full after:transition-all after:duration-300"
          style="color: var(--text-primary, #0F172A);"
        >How It Works</a>
        <a 
          href="#diagnostic-pipeline" 
          class="relative py-1 transition-colors duration-200 hover:text-indigo-500 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-indigo-500 hover:after:w-full after:transition-all after:duration-300"
          style="color: var(--text-primary, #0F172A);"
        >Flow Pipeline</a>
        <a 
          href="#social-proof" 
          class="relative py-1 transition-colors duration-200 hover:text-indigo-500 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-indigo-500 hover:after:w-full after:transition-all after:duration-300"
          style="color: var(--text-primary, #0F172A);"
        >Social Proof</a>
      </div>

      <!-- CTA Button -->
      <RouterLink 
        to="/analyse" 
        class="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold tracking-tight hover:bg-indigo-500 shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        Try Free &rarr;
      </RouterLink>
    </nav>
  </div>
</template>
