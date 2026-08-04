<script setup>
import { ref, onMounted } from 'vue'
import { revealUp, revealScale } from '../utils/ScrollAnimations.js'

const titleRef = ref(null)
const imgRef = ref(null)
const quotesRef = ref(null)

onMounted(() => {
  revealUp(titleRef.value, { y: 50 })
  revealScale(imgRef.value, { scale: 0.92, duration: 1.2 })
  revealUp(quotesRef.value, { y: 40, delay: 0.2 })
})

const testimonials = [
  {
    quote: "Klarix transformed my content strategy. I finally know what actually works instead of guessing.",
    name: 'Arjun M.',
    role: 'Founder & Content Creator',
    avatar: '🧑‍💻'
  },
  {
    quote: "The script teardown alone is worth it. My retention went up 40% in two weeks.",
    name: 'Priya S.',
    role: 'Social Media Manager',
    avatar: '👩‍💼'
  },
  {
    quote: "I replaced 3 tools with Klarix. Analysis, strategy, and scripting — all in one place.",
    name: 'Rahul K.',
    role: 'Digital Marketer',
    avatar: '👨‍🎨'
  }
]
</script>

<template>
  <section id="social-proof" class="section-padding relative overflow-hidden">
    <div class="absolute inset-0 bg-[#F5F5F4]"></div>

    <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <!-- Header -->
      <div ref="titleRef" class="text-center mb-16">
        <span class="inline-block mb-4 text-xs font-semibold font-display tracking-widest uppercase text-[#A3A3A3]">
          Trusted by Creators
        </span>
        <h2 class="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[-0.035em] leading-[1.08] text-[#0A0A0A]">
          Used by creators<br />
          <span class="relative inline-block">
            <span class="relative z-10">who mean business.</span>
            <span class="absolute bottom-1 left-0 w-full h-3 bg-[#CDFF00] -z-0 rounded-sm"></span>
          </span>
        </h2>
      </div>

      <!-- Enterprise Office Image -->
      <div ref="imgRef" class="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] mb-16">
        <img
          src="/landing/social-proof-office.png"
          alt="Busy enterprise office with teams using Klarix on multiple monitors"
          class="w-full h-[300px] sm:h-[400px] object-cover"
          loading="lazy"
        />
      </div>

      <!-- Testimonials Grid -->
      <div ref="quotesRef" class="grid md:grid-cols-3 gap-6">
        <div
          v-for="testimonial in testimonials"
          :key="testimonial.name"
          class="bg-white rounded-2xl border border-[#E5E5E5] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500"
        >
          <!-- Star rating -->
          <div class="flex gap-0.5 mb-4">
            <span v-for="n in 5" :key="n" class="text-[#CDFF00] text-lg">★</span>
          </div>

          <p class="text-[#525252] leading-relaxed mb-6 text-base">
            "{{ testimonial.quote }}"
          </p>

          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#F5F5F4] flex items-center justify-center text-lg">
              {{ testimonial.avatar }}
            </div>
            <div>
              <div class="text-sm font-semibold text-[#0A0A0A]">{{ testimonial.name }}</div>
              <div class="text-xs text-[#A3A3A3]">{{ testimonial.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
