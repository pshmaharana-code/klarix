<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { revealUp, revealScale, parallax } from '../utils/ScrollAnimations.js'

const heroRef = ref(null)
const headlineRef = ref(null)
const subRef = ref(null)
const ctaRef = ref(null)
const imgRef = ref(null)

onMounted(() => {
  revealUp(headlineRef.value, { y: 80, duration: 1.2, delay: 0.2 })
  revealUp(subRef.value, { y: 50, duration: 1, scrollTrigger: { start: 'top 95%' } })
  revealUp(ctaRef.value, { y: 40, duration: 0.8, scrollTrigger: { start: 'top 95%' } })
  revealScale(imgRef.value, { scale: 0.9, duration: 1.4 })
  parallax(imgRef.value, -40)
})
</script>

<template>
  <section ref="heroRef" class="relative min-h-screen flex items-center overflow-hidden">
    <!-- Background Video -->
    <video
      class="video-bg opacity-[0.06]"
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
    >
      <source src="/videos/bg-ambient-1.mp4" type="video/mp4" />
    </video>

    <!-- Soft gradient overlay -->
    <div class="absolute inset-0 bg-gradient-to-b from-[#FAFAF9] via-transparent to-[#FAFAF9] z-[1]"></div>

    <!-- Content -->
    <div class="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-20">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <!-- Left: Text -->
        <div class="text-center lg:text-left">
          <div ref="headlineRef">
            <span class="inline-block mb-5 px-4 py-1.5 rounded-full bg-[#0A0A0A] text-white text-xs font-semibold font-display tracking-wide uppercase">
              AI-Powered Content Intelligence
            </span>
            <h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-[4.5rem] xl:text-[5rem] font-display font-bold tracking-[-0.04em] leading-[1.05] text-[#0A0A0A]">
              Stop guessing why your posts
              <span class="relative inline-block">
                <span class="relative z-10">aren't growing.</span>
                <span class="absolute bottom-1 left-0 w-full h-3 bg-[#CDFF00] -z-0 rounded-sm"></span>
              </span>
            </h1>
          </div>

          <p ref="subRef" class="mt-6 text-lg sm:text-xl text-[#525252] max-w-xl leading-relaxed mx-auto lg:mx-0">
            Upload your content. Paste your stats. Klarix tells you exactly what to fix — and writes your next post.
          </p>

          <div ref="ctaRef" class="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <RouterLink to="/analyse" class="btn-accent">
              Analyse My Post Free
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </RouterLink>
            <RouterLink to="/demo" class="btn-secondary">
              See Demo
            </RouterLink>
          </div>

          <!-- Trust line -->
          <p class="mt-8 text-sm text-[#A3A3A3] font-medium">
            Free analysis · No signup required · Results in 30 seconds
          </p>
        </div>

        <!-- Right: Hero Image -->
        <div ref="imgRef" class="relative lg:pl-8">
          <div class="relative rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.1)]">
            <img
              src="/landing/hero-dashboard.png"
              alt="Klarix Dashboard showing content analytics in a modern office setting"
              class="w-full h-auto"
              loading="eager"
            />
          </div>
          <!-- Floating accent -->
          <div class="absolute -bottom-6 -left-6 w-24 h-24 bg-[#CDFF00] rounded-2xl -z-10 opacity-60 blur-xl"></div>
          <div class="absolute -top-6 -right-6 w-32 h-32 bg-[#CDFF00]/30 rounded-full -z-10 blur-2xl"></div>
        </div>
      </div>
    </div>
  </section>
</template>
