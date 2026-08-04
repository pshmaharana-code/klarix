<script setup>
import { ref, onMounted } from 'vue'
import { revealUp, animateCounter } from '../utils/ScrollAnimations.js'

const sectionRef = ref(null)
const titleRef = ref(null)
const counter1 = ref(null)
const counter2 = ref(null)
const counter3 = ref(null)
const counter4 = ref(null)
const imgRef = ref(null)

const metrics = [
  { ref: 'counter1', value: 35, prefix: '+', suffix: '%', label: 'Retention Boost', sublabel: 'Average improvement' },
  { ref: 'counter2', value: 2.4, prefix: '', suffix: 'x', label: 'More Saves', sublabel: 'Content bookmarks', decimals: 1 },
  { ref: 'counter3', value: 120, prefix: '', suffix: 'K', label: 'Views Generated', sublabel: 'Across all users' },
  { ref: 'counter4', value: 92, prefix: '', suffix: '/100', label: 'Viral Score', sublabel: 'Average script rating' }
]

onMounted(() => {
  revealUp(titleRef.value, { y: 50 })

  // Animate counters
  if (counter1.value) animateCounter(counter1.value, 35, { prefix: '+', suffix: '%' })
  if (counter2.value) animateCounter(counter2.value, 2.4, { suffix: 'x', decimals: 1 })
  if (counter3.value) animateCounter(counter3.value, 120, { suffix: 'K' })
  if (counter4.value) animateCounter(counter4.value, 92, { suffix: '/100' })
})
</script>

<template>
  <section id="metrics" ref="sectionRef" class="section-padding relative overflow-hidden">
    <div class="absolute inset-0 bg-[#F5F5F4]"></div>

    <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <!-- Header -->
      <div ref="titleRef" class="text-center mb-16">
        <span class="inline-block mb-4 text-xs font-semibold font-display tracking-widest uppercase text-[#A3A3A3]">
          Proven Results
        </span>
        <h2 class="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[-0.035em] leading-[1.08] text-[#0A0A0A]">
          Numbers that<br />
          <span class="relative inline-block">
            <span class="relative z-10">speak louder.</span>
            <span class="absolute bottom-1 left-0 w-full h-3 bg-[#CDFF00] -z-0 rounded-sm"></span>
          </span>
        </h2>
      </div>

      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <!-- Metric 1 -->
        <div class="bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
          <div class="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#CDFF00]/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div ref="counter1" class="text-4xl sm:text-5xl font-display font-bold text-[#0A0A0A] tracking-[-0.03em]">+35%</div>
          <div class="mt-2 text-sm font-semibold text-[#0A0A0A]">Retention Boost</div>
          <div class="text-xs text-[#A3A3A3] mt-1">Average improvement</div>
        </div>

        <!-- Metric 2 -->
        <div class="bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
          <div class="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#CDFF00]/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          </div>
          <div ref="counter2" class="text-4xl sm:text-5xl font-display font-bold text-[#0A0A0A] tracking-[-0.03em]">2.4x</div>
          <div class="mt-2 text-sm font-semibold text-[#0A0A0A]">More Saves</div>
          <div class="text-xs text-[#A3A3A3] mt-1">Content bookmarks</div>
        </div>

        <!-- Metric 3 -->
        <div class="bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
          <div class="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#CDFF00]/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div ref="counter3" class="text-4xl sm:text-5xl font-display font-bold text-[#0A0A0A] tracking-[-0.03em]">120K</div>
          <div class="mt-2 text-sm font-semibold text-[#0A0A0A]">Views Generated</div>
          <div class="text-xs text-[#A3A3A3] mt-1">Across all users</div>
        </div>

        <!-- Metric 4 -->
        <div class="bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
          <div class="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#CDFF00]/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m6.41 7.41-2.83-2.83"/><path d="M2 12h4"/><path d="m6.41 16.59-2.83 2.83"/><path d="M12 18v4"/><path d="m17.59 16.59 2.83 2.83"/><path d="M18 12h4"/><path d="m17.59 7.41 2.83-2.83"/><circle cx="12" cy="12" r="4"/></svg>
          </div>
          <div ref="counter4" class="text-4xl sm:text-5xl font-display font-bold text-[#0A0A0A] tracking-[-0.03em]">92/100</div>
          <div class="mt-2 text-sm font-semibold text-[#0A0A0A]">Viral Score</div>
          <div class="text-xs text-[#A3A3A3] mt-1">Average script rating</div>
        </div>
      </div>

      <!-- Stats Image -->
      <div ref="imgRef" class="max-w-4xl mx-auto">
        <div class="rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.1)]">
          <img
            src="/landing/metrics-stats.png"
            alt="Klarix metrics dashboard showing +35% retention, 2.4x saves, 120K views"
            class="w-full h-auto"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  </section>
</template>
