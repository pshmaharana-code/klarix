<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { revealUp, revealLeft, revealRight } from '../utils/ScrollAnimations.js'

const titleRef = ref(null)
const card1Ref = ref(null)
const card2Ref = ref(null)

onMounted(() => {
  revealUp(titleRef.value, { y: 50 })
  revealLeft(card1Ref.value, { x: -60, duration: 1 })
  revealRight(card2Ref.value, { x: 60, duration: 1 })
})
</script>

<template>
  <section id="diagnostic-pipeline" class="section-padding relative">
    <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <!-- Section Header -->
      <div ref="titleRef" class="text-center mb-16">
        <span class="inline-block mb-4 text-xs font-semibold font-display tracking-widest uppercase text-[#A3A3A3]">
          Diagnostic Output
        </span>
        <h2 class="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[-0.035em] leading-[1.08] text-[#0A0A0A]">
          See exactly what<br />
          <span class="relative inline-block">
            <span class="relative z-10">Klarix produces.</span>
            <span class="absolute bottom-1 left-0 w-full h-3 bg-[#CDFF00] -z-0 rounded-sm"></span>
          </span>
        </h2>
        <p class="mt-6 text-lg text-[#525252] max-w-2xl mx-auto leading-relaxed">
          We ran a real founder's post through our specialized 3-agent diagnostic pipeline. Here's the depth of insights you receive.
        </p>
      </div>

      <!-- Two cards side by side -->
      <div class="grid md:grid-cols-2 gap-8">
        <!-- Retention Analysis -->
        <div ref="card1Ref" class="group">
          <div class="rounded-2xl overflow-hidden bg-white border border-[#E5E5E5] shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1">
            <div class="overflow-hidden">
              <img
                src="/landing/diagnostic-retention.png"
                alt="Klarix Video Retention Analysis — audience drop-off detection, hook retention scoring"
                class="w-full h-auto transition-transform duration-700 group-hover:scale-[1.03]"
                loading="lazy"
              />
            </div>
            <div class="p-6">
              <h3 class="text-xl font-display font-bold text-[#0A0A0A] tracking-[-0.02em]">
                Video Retention Analysis
              </h3>
              <p class="mt-2 text-sm text-[#525252] leading-relaxed">
                Pinpoints exact drop-off timestamps and calculates hook retention scores so you know precisely where viewers lose interest.
              </p>
            </div>
          </div>
        </div>

        <!-- Script Teardown -->
        <div ref="card2Ref" class="group">
          <div class="rounded-2xl overflow-hidden bg-white border border-[#E5E5E5] shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1">
            <div class="overflow-hidden">
              <img
                src="/landing/diagnostic-script.png"
                alt="Klarix Script Teardown — Hook, Body, CTA breakdown with B-roll suggestions"
                class="w-full h-auto transition-transform duration-700 group-hover:scale-[1.03]"
                loading="lazy"
              />
            </div>
            <div class="p-6">
              <h3 class="text-xl font-display font-bold text-[#0A0A0A] tracking-[-0.02em]">
                Script Teardown
              </h3>
              <p class="mt-2 text-sm text-[#525252] leading-relaxed">
                Breaks your script into Hook, Body, and CTA segments with kinetic text suggestions and B-roll direction for each phase.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center mt-14">
        <RouterLink to="/demo" class="btn-secondary">
          See the full demo →
        </RouterLink>
      </div>
    </div>
  </section>
</template>



