<script setup>
import { ref, onMounted } from 'vue'
import { revealUp, revealScale } from '../utils/ScrollAnimations.js'

const titleRef = ref(null)
const imgRef = ref(null)
const featuresRef = ref(null)

onMounted(() => {
  revealUp(titleRef.value, { y: 50 })
  revealScale(imgRef.value, { scale: 0.9, duration: 1.4 })
  revealUp(featuresRef.value, { y: 30, delay: 0.3 })
})
</script>

<template>
  <section id="ai-engine" class="section-padding relative overflow-hidden">
    <!-- Background -->
    <div class="absolute inset-0 bg-[#0A0A0A]"></div>

    <!-- Subtle ambient video -->
    <video
      class="video-bg opacity-[0.12]"
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
    >
      <source src="/videos/bg-ambient-2.mp4" type="video/mp4" />
    </video>

    <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <!-- Section Header -->
      <div ref="titleRef" class="text-center mb-16">
        <span class="inline-block mb-4 px-4 py-1.5 rounded-full bg-[#CDFF00] text-[#0A0A0A] text-xs font-bold font-display tracking-wide uppercase">
          AI Intelligence Engine
        </span>
        <h2 class="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[-0.035em] leading-[1.08] text-white">
          3-Node Content<br/>
          Command System.
        </h2>
        <p class="mt-6 text-lg text-[#A3A3A3] max-w-2xl mx-auto leading-relaxed">
          Three specialized AI agents work in sequence to analyse, strategise, and script your content — delivering actionable insights in seconds.
        </p>
      </div>

      <!-- Pipeline Image -->
      <div ref="imgRef" class="relative max-w-5xl mx-auto">
        <div class="rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
          <img
            src="/landing/ai-engine-pipeline.png"
            alt="Klarix 3-Node AI Intelligence Engine: Visual Analyst, Strategist, Scriptwriter"
            class="w-full h-auto"
            loading="lazy"
          />
        </div>
        <!-- Glow accents -->
        <div class="absolute -bottom-10 left-1/4 w-40 h-40 bg-[#CDFF00]/20 rounded-full blur-3xl"></div>
        <div class="absolute -top-10 right-1/4 w-32 h-32 bg-purple-500/15 rounded-full blur-3xl"></div>
      </div>

      <!-- Feature chips -->
      <div ref="featuresRef" class="flex flex-wrap justify-center gap-4 mt-14">
        <div class="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          <div class="w-2 h-2 rounded-full bg-[#CDFF00]"></div>
          <span class="text-sm font-medium text-white/80">Real-time Intelligence</span>
        </div>
        <div class="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          <div class="w-2 h-2 rounded-full bg-purple-400"></div>
          <span class="text-sm font-medium text-white/80">End-to-End Automation</span>
        </div>
        <div class="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          <div class="w-2 h-2 rounded-full bg-blue-400"></div>
          <span class="text-sm font-medium text-white/80">Built for Scale</span>
        </div>
      </div>
    </div>
  </section>
</template>
