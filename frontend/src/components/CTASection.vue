<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { revealUp, revealLeft, revealRight } from '../utils/ScrollAnimations.js'

const textRef = ref(null)
const imgRef = ref(null)

onMounted(() => {
  revealLeft(textRef.value, { x: -60 })
  revealRight(imgRef.value, { x: 60 })
})
</script>

<template>
  <section class="section-padding relative overflow-hidden">
    <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <div class="relative rounded-3xl overflow-hidden bg-[#0A0A0A] p-10 sm:p-16 lg:p-20">
        <!-- Background accent -->
        <div class="absolute top-0 right-0 w-96 h-96 bg-[#CDFF00]/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-[#CDFF00]/5 rounded-full blur-2xl"></div>

        <div class="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <!-- Left: Text -->
          <div ref="textRef">
            <h2 class="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-[-0.035em] leading-[1.08] text-white">
              Ready to stop<br />
              <span class="text-[#CDFF00]">guessing?</span>
            </h2>
            <p class="mt-6 text-lg text-white/60 leading-relaxed max-w-md">
              Analyse your first post for free. No signup required. Get actionable insights in under 30 seconds.
            </p>

            <div class="mt-10 flex flex-col sm:flex-row gap-4">
              <RouterLink to="/analyse" class="btn-accent">
                Analyse My Post Free
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </RouterLink>
            </div>

            <div class="mt-8 flex items-center gap-6 text-sm text-white/40">
              <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>100% Secure</span>
              </div>
              <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>30s Results</span>
              </div>
              <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>No Signup</span>
              </div>
            </div>
          </div>

          <!-- Right: Mobile Phone Image -->
          <div ref="imgRef" class="relative flex justify-center">
            <div class="relative w-[280px] sm:w-[320px]">
              <div class="rounded-[2rem] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.4)] border-[6px] border-white/10">
                <img
                  src="/landing/mobile-cta.jpeg"
                  alt="Klarix app on mobile showing script breakdown and diagnostic metrics"
                  class="w-full h-auto"
                  loading="lazy"
                />
              </div>
              <!-- Floating lime accent -->
              <div class="absolute -top-4 -right-4 w-20 h-20 bg-[#CDFF00] rounded-2xl flex items-center justify-center shadow-lg">
                <span class="text-2xl">🚀</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
