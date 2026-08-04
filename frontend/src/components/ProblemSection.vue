<script setup>
import { ref, onMounted } from 'vue'
import { revealLeft, revealRight } from '../utils/ScrollAnimations.js'

const textRef = ref(null)
const imgRef = ref(null)

onMounted(() => {
  revealLeft(textRef.value, { x: -60 })
  revealRight(imgRef.value, { x: 60 })
})
</script>

<template>
  <section id="why-klarix" class="section-padding relative overflow-hidden">
    <div class="absolute inset-0 bg-[#F5F5F4]"></div>

    <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <!-- Left: Text -->
        <div ref="textRef">
          <span class="inline-block mb-4 text-xs font-semibold font-display tracking-widest uppercase text-[#A3A3A3]">
            The Problem
          </span>
          <h2 class="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[-0.035em] leading-[1.08] text-[#0A0A0A]">
            You post.<br />
            <span class="text-[#525252]">You guess.</span><br />
            You repeat.
          </h2>

          <div class="mt-8 p-8 rounded-2xl bg-white border border-[#E5E5E5] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div class="w-1 h-12 bg-[#CDFF00] rounded-full mb-4"></div>
            <p class="text-lg sm:text-xl text-[#525252] leading-relaxed">
              Most founders spend hours creating content, get confusing numbers back, and have no idea what to change. So they post again and repeat the exact same mistakes.
            </p>
          </div>

          <div class="mt-6 flex items-center gap-6 text-sm text-[#A3A3A3] font-medium">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-red-400"></div>
              <span>Low engagement</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-orange-400"></div>
              <span>No clear feedback</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span>Wasted time</span>
            </div>
          </div>
        </div>

        <!-- Right: Image -->
        <div ref="imgRef" class="relative">
          <div class="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
            <img
              src="/landing/problem-founder.jpg"
              alt="Content creator struggling with analytics"
              class="w-full h-[420px] object-cover"
              loading="lazy"
            />
          </div>
          <div class="absolute -bottom-4 -right-4 w-20 h-20 border-2 border-[#CDFF00] rounded-xl -z-10"></div>
        </div>
      </div>
    </div>
  </section>
</template>
