<script setup>
import { ref, onMounted } from 'vue'
import { revealUp, staggerReveal } from '../utils/ScrollAnimations.js'

const titleRef = ref(null)
const stepsRef = ref(null)

const steps = [
  {
    number: '01',
    title: 'Upload Content',
    description: 'Upload your reel, carousel, or static post directly into our high-speed analysis engine.',
    image: '/landing/step1-creator.jpeg',
    imageAlt: 'Creator uploading content on laptop at a café'
  },
  {
    number: '02',
    title: 'Provide Stats',
    description: 'Paste your analytics (views, watch time, saves, reach) so our AI correlates your exact visual frames with viewer drop-offs.',
    image: '/landing/step2-analytics.jpg',
    imageAlt: 'Founder analyzing dashboard metrics'
  },
  {
    number: '03',
    title: 'Get Strategy & Script',
    description: 'Receive your diagnostic teardown plus a high-converting, ready-to-record replacement script tailored to your bottleneck.',
    image: '/landing/step3-team.jpg',
    imageAlt: 'Team collaborating on content analytics'
  }
]

onMounted(() => {
  revealUp(titleRef.value, { y: 50 })
})
</script>

<template>
  <section id="how-it-works" class="section-padding relative">
    <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <!-- Section Header -->
      <div ref="titleRef" class="text-center mb-20">
        <span class="inline-block mb-4 text-xs font-semibold font-display tracking-widest uppercase text-[#A3A3A3]">
          How It Works
        </span>
        <h2 class="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[-0.035em] leading-[1.08] text-[#0A0A0A]">
          Three steps to<br />
          <span class="relative inline-block">
            <span class="relative z-10">content clarity.</span>
            <span class="absolute bottom-1 left-0 w-full h-3 bg-[#CDFF00] -z-0 rounded-sm"></span>
          </span>
        </h2>
      </div>

      <!-- Steps -->
      <div ref="stepsRef" class="space-y-20 lg:space-y-32">
        <div
          v-for="(step, i) in steps"
          :key="step.number"
          class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center step-item"
          :class="i % 2 === 1 ? 'lg:direction-rtl' : ''"
        >
          <!-- Text Side -->
          <div :class="i % 2 === 1 ? 'lg:order-2' : ''">
            <div class="flex items-center gap-4 mb-6">
              <span class="text-6xl sm:text-7xl font-display font-bold text-[#CDFF00] leading-none tracking-[-0.04em]">
                {{ step.number }}
              </span>
              <div class="h-px flex-1 bg-[#E5E5E5]"></div>
            </div>
            <h3 class="text-3xl sm:text-4xl font-display font-bold tracking-[-0.03em] text-[#0A0A0A] mb-4">
              {{ step.title }}
            </h3>
            <p class="text-lg text-[#525252] leading-relaxed max-w-md">
              {{ step.description }}
            </p>
          </div>

          <!-- Image Side -->
          <div :class="i % 2 === 1 ? 'lg:order-1' : ''">
            <div class="relative group">
              <div class="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-transform duration-700 group-hover:scale-[1.02]">
                <img
                  :src="step.image"
                  :alt="step.imageAlt"
                  class="w-full h-[350px] sm:h-[400px] object-cover"
                  loading="lazy"
                />
              </div>
              <!-- Step number accent -->
              <div class="absolute -bottom-4 -left-4 w-16 h-16 bg-[#CDFF00] rounded-xl flex items-center justify-center shadow-lg">
                <span class="text-xl font-display font-bold text-[#0A0A0A]">{{ step.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.step-item {
  opacity: 0;
  transform: translateY(50px);
  animation: stepReveal 0.8s ease-out forwards;
  animation-play-state: paused;
}

@keyframes stepReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
