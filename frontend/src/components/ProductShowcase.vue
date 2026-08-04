<script setup>
import { ref, onMounted } from 'vue'
import { revealUp, revealScale, parallax } from '../utils/ScrollAnimations.js'

const titleRef = ref(null)
const imgRef = ref(null)

onMounted(() => {
  revealUp(titleRef.value, { y: 50 })
  revealScale(imgRef.value, { scale: 0.92, duration: 1.2 })
})
</script>

<template>
  <section class="section-padding relative overflow-hidden">
    <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <!-- Left: Image -->
        <div ref="imgRef" class="relative order-2 lg:order-1">
          <div class="rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
            <img
              src="/landing/product-showcase.png"
              alt="Klarix Content Strategy dashboard on a MacBook surrounded by crystal elements"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
          <!-- Decorative accent -->
          <div class="absolute -top-8 -left-8 w-32 h-32 bg-[#CDFF00]/15 rounded-full blur-2xl"></div>
        </div>

        <!-- Right: Text -->
        <div ref="titleRef" class="order-1 lg:order-2">
          <span class="inline-block mb-4 text-xs font-semibold font-display tracking-widest uppercase text-[#A3A3A3]">
            The Full Picture
          </span>
          <h2 class="text-4xl sm:text-5xl font-display font-bold tracking-[-0.035em] leading-[1.08] text-[#0A0A0A]">
            Your content strategy,<br />
            <span class="relative inline-block">
              <span class="relative z-10">visualised.</span>
              <span class="absolute bottom-1 left-0 w-full h-3 bg-[#CDFF00] -z-0 rounded-sm"></span>
            </span>
          </h2>
          <p class="mt-6 text-lg text-[#525252] leading-relaxed max-w-md">
            From total views and engagement rates to best posting times and AI strategy briefs — everything you need to dominate content, in one beautiful dashboard.
          </p>

          <div class="mt-8 space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-[#CDFF00] flex items-center justify-center mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span class="text-[#525252]">Performance tracking across all content types</span>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-[#CDFF00] flex items-center justify-center mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span class="text-[#525252]">AI-generated content recommendations</span>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-[#CDFF00] flex items-center justify-center mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span class="text-[#525252]">Optimal posting schedule analysis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
