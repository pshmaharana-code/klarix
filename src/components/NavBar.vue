<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="fixed top-0 w-full z-50 flex justify-center pt-6 px-4 pointer-events-none">
    <nav class="flex items-center justify-between w-full max-w-5xl px-6 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 pointer-events-auto shadow-2xl">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center">
        <img src="/brand_logo.jpeg" alt="Klarix Logo" class="h-8 w-auto object-contain" />
      </RouterLink>
      
      <!-- Center Links -->
      <div class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
        <RouterLink to="/" class="hover:text-white transition-colors">Home</RouterLink>
        <a href="#about" class="hover:text-white transition-colors">About</a>
        <a href="#curriculum" class="hover:text-white transition-colors">Curriculum</a>
        <a href="#pricing" class="hover:text-white transition-colors">Pricing</a>
        <a href="#faqs" class="hover:text-white transition-colors">FAQs</a>
      </div>
      
      <!-- CTA Button -->
      <RouterLink 
        to="/analyse" 
        class="px-6 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors"
      >
        Try Free →
      </RouterLink>
    </nav>
  </div>
</template>
