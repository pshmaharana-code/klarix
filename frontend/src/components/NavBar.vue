<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap } from 'gsap'

const navRef = ref(null)
const isScrolled = ref(false)
const isMobileOpen = ref(false)
const isLoaded = ref(false)

const navLinks = [
  { label: 'Why Klarix', href: '#why-klarix' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'AI Engine', href: '#ai-engine' },
  { label: 'Results', href: '#metrics' }
]

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)

  window.addEventListener('scroll', () => {
    isScrolled.value = window.scrollY > 40
  }, { passive: true })
})

function toggleMobile() {
  isMobileOpen.value = !isMobileOpen.value
}

function closeMobile() {
  isMobileOpen.value = false
}
</script>

<template>
  <div
    ref="navRef"
    class="fixed top-0 w-full z-50 transition-all duration-500"
    :class="isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'"
  >
    <div
      class="flex justify-center px-4 transition-all duration-500"
      :class="isScrolled ? 'pt-3' : 'pt-5'"
    >
      <nav
        class="flex items-center justify-between w-full max-w-6xl px-6 py-3 rounded-full border transition-all duration-500"
        :class="isScrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] border-[#E5E5E5]'
          : 'bg-white/60 backdrop-blur-md border-transparent shadow-none'"
      >
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center gap-2.5">
          <img src="/brand_logo.jpeg" alt="Klarix Logo" class="h-8 w-auto object-contain rounded-lg" />
          <span class="font-display font-bold text-xl tracking-[-0.035em] text-[#0A0A0A]">Klarix</span>
        </RouterLink>

        <!-- Desktop Nav Links -->
        <div class="hidden md:flex items-center gap-8 text-sm font-medium tracking-[-0.01em]">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="text-[#525252] hover:text-[#0A0A0A] transition-colors duration-200 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#CDFF00] hover:after:w-full after:transition-all after:duration-300"
          >
            {{ link.label }}
          </a>
        </div>

        <!-- Desktop CTA -->
        <div class="hidden md:flex items-center gap-3">
          <RouterLink
            to="/analyse"
            class="px-6 py-2.5 rounded-full bg-[#0A0A0A] text-white text-sm font-semibold font-display tracking-[-0.01em] hover:bg-[#262626] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Try Free →
          </RouterLink>
        </div>

        <!-- Mobile Hamburger -->
        <button
          class="md:hidden flex flex-col gap-1.5 p-2 group"
          @click="toggleMobile"
          aria-label="Toggle menu"
        >
          <span
            class="w-6 h-0.5 bg-[#0A0A0A] transition-all duration-300"
            :class="isMobileOpen ? 'rotate-45 translate-y-2' : ''"
          ></span>
          <span
            class="w-6 h-0.5 bg-[#0A0A0A] transition-all duration-300"
            :class="isMobileOpen ? 'opacity-0' : ''"
          ></span>
          <span
            class="w-6 h-0.5 bg-[#0A0A0A] transition-all duration-300"
            :class="isMobileOpen ? '-rotate-45 -translate-y-2' : ''"
          ></span>
        </button>
      </nav>
    </div>

    <!-- Mobile Menu -->
    <div
      v-if="isMobileOpen"
      class="md:hidden mx-4 mt-2 p-6 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#E5E5E5] shadow-[0_10px_40px_rgba(0,0,0,0.1)]"
    >
      <div class="flex flex-col gap-4">
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="text-[#0A0A0A] text-lg font-medium font-display tracking-[-0.02em] py-2 border-b border-[#F0F0F0] last:border-none hover:text-[#525252] transition-colors"
          @click="closeMobile"
        >
          {{ link.label }}
        </a>
        <RouterLink
          to="/analyse"
          class="btn-accent text-center mt-2"
          @click="closeMobile"
        >
          Analyse My Post Free →
        </RouterLink>
      </div>
    </div>
  </div>
</template>
