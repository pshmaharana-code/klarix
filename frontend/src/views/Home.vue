<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

// DOM Targets for Scrollytelling & Stacking Choreography
const heroTextRef = ref(null)
const heroVideoRef = ref(null)
const heroBannerRef = ref(null)
const bannerContainerRef = ref(null)
const card1Ref = ref(null)
const card2Ref = ref(null)
const card3Ref = ref(null)
const bentoCellsRef = ref([])
const footerTextRef = ref(null)


let lenis = null
let tickerCallback = null

const setBentoCellRef = (el) => {
  if (el && !bentoCellsRef.value.includes(el)) {
    bentoCellsRef.value.push(el)
  }
}

onMounted(async () => {
  await nextTick()

  // ─── 1. Lenis Buttery Smooth Scroll ───
  lenis = new Lenis({
    duration: 1.3,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothTouch: false,
  })

  lenis.on('scroll', ScrollTrigger.update)

  tickerCallback = (time) => {
    if (lenis) lenis.raf(time * 1000)
  }
  gsap.ticker.add(tickerCallback)
  gsap.ticker.lagSmoothing(0, 0)


  // ─── 3. Hero Section: Immersive Parallax & Architectural Aperture Reveal ───
  if (heroVideoRef.value) {
    gsap.to(heroVideoRef.value, {
      y: 90,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero-typography-container',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.4,
      }
    })
  }

  if (heroTextRef.value) {
    gsap.to(heroTextRef.value, {
      y: 70,
      opacity: 0.15,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero-typography-container',
        start: 'top top',
        end: '75% top',
        scrub: true,
      }
    })
  }

  // Architectural Camera Aperture Unmask
  if (heroBannerRef.value && bannerContainerRef.value) {
    gsap.fromTo(
      heroBannerRef.value,
      { clipPath: 'inset(16% 12% 16% 12%)', scale: 0.92 },
      { 
        clipPath: 'inset(0% 0% 0% 0%)',
        scale: 1.0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: bannerContainerRef.value,
          start: 'top 85%',
          end: 'center 35%',
          scrub: 0.7,
        }
      }
    )
  }

  // ─── 4. The Engine: Sticky Stacking Cards Sequence ───
  if (card1Ref.value && card2Ref.value && card3Ref.value) {
    gsap.to(card1Ref.value, {
      scale: 0.94,
      opacity: 0.45,
      y: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: card2Ref.value,
        start: 'top 85%',
        end: 'top 20%',
        scrub: true,
      }
    })

    gsap.to(card2Ref.value, {
      scale: 0.96,
      opacity: 0.6,
      y: -10,
      ease: 'none',
      scrollTrigger: {
        trigger: card3Ref.value,
        start: 'top 85%',
        end: 'top 20%',
        scrub: true,
      }
    })
  }

  // ─── 5. Bento Grid: Asymmetrical Sequential Slide-Up & Fade ───
  if (bentoCellsRef.value.length > 0) {
    gsap.from(bentoCellsRef.value, {
      y: 80,
      opacity: 0,
      duration: 1.3,
      stagger: 0.2,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: '#bento-section',
        start: 'top 75%',
        toggleActions: 'play none none none',
      }
    })
  }

  // ─── 6. Footer CTA: Massive Viewport-Filling Typography Parallax ───
  if (footerTextRef.value) {
    gsap.from(footerTextRef.value, {
      y: 120,
      opacity: 0.2,
      duration: 1.5,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#cta-footer',
        start: 'top 82%',
        toggleActions: 'play none none none',
      }
    })
  }

  ScrollTrigger.refresh()
  window.addEventListener('resize', () => ScrollTrigger.refresh())
})

onUnmounted(() => {
  if (lenis) lenis.destroy()
  if (tickerCallback) gsap.ticker.remove(tickerCallback)
  ScrollTrigger.getAll().forEach(trigger => trigger.kill())
})
</script>

<template>
  <!-- Base Pristine Daylight Canvas -->
  <div class="relative w-full min-h-screen bg-[#F9F9FA] text-[#111111] font-display">


    <!-- ─── ARCHITECTURAL FLUID GLASS NAVIGATION SLAB ─── -->
    <div class="fixed top-0 left-0 w-full z-50 pointer-events-none pt-4 sm:pt-6 px-4 sm:px-12 transition-all duration-300">
      <header class="max-w-[92rem] mx-auto pointer-events-auto liquid-glass-pane rounded-2xl transition-all duration-500 hover:bg-white/45">
        <div class="px-6 sm:px-10 h-20 flex items-center justify-between">
          
          <!-- Brand Logo Reference styled with clean Radio Grotesk tracking -->
          <a href="#hero-section" class="interactive-hover flex items-center gap-4 group">
            <img
              src="/brand_logo.jpeg"
              alt="Klarix Brand Logo"
              class="h-10 w-auto object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300 filter contrast-[1.05]"
            />
            <span class="font-display font-black text-2xl sm:text-3xl tracking-[0.04em] text-[#111111] uppercase">Klarix</span>
          </a>

          <!-- Minimalist Architectural Nav Menu in Pure Radio Grotesk -->
          <nav class="flex items-center gap-7 sm:gap-12 lg:gap-16 text-xs sm:text-sm font-display font-black uppercase tracking-[0.15em] text-[#222222]">
            <a href="#hero-section" class="interactive-hover py-2 border-b-2 border-transparent hover:border-[#E50914] hover:text-[#E50914] transition-all duration-200">Platform</a>
            <a href="#engine-section" class="interactive-hover py-2 border-b-2 border-transparent hover:border-[#E50914] hover:text-[#E50914] transition-all duration-200">The Engine</a>
            <a href="#bento-section" class="interactive-hover py-2 border-b-2 border-transparent hover:border-[#E50914] hover:text-[#E50914] transition-all duration-200">Ecosystem</a>
            <a href="#cta-footer" class="interactive-hover py-2 border-b-2 border-transparent hover:border-[#E50914] hover:text-[#E50914] transition-all duration-200">Results</a>
          </nav>

        </div>
      </header>
    </div>

    <!-- ─── A. HERO SECTION (IMMERSIVE FULLSCREEN 3D CUBE & TYPOGRAPHIC PAIRING) ─── -->
    <section id="hero-section" class="relative w-full flex flex-col justify-between overflow-hidden">
      
      <div id="hero-typography-container" class="relative w-full min-h-[92vh] pt-36 sm:pt-48 pb-16 sm:pb-24 flex flex-col justify-end overflow-hidden">
        <div class="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <video
            ref="heroVideoRef"
            autoplay
            muted
            loop
            playsinline
            class="w-full h-full object-cover opacity-100 filter contrast-[1.18] brightness-[1.04] saturate-[1.4]"
          >
            <source src="/assets/original-f50b1fa7fa6eb5b36b81ba1d30f23c35.mp4" type="video/mp4" />
          </video>
          <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F9F9FA] to-transparent opacity-50"></div>
        </div>

        <!-- Massive Screen-Filling Typography: DIGITAL INFRASTRUCTURE in Durer, FOR CONTENT in Radio Grotesk -->
        <div ref="heroTextRef" class="relative z-10 max-w-[94rem] mx-auto px-6 sm:px-12 mt-auto w-full">
          
          <div class="flex items-center gap-3.5 mb-8 font-display text-xs sm:text-sm font-black tracking-[0.22em] text-[#111111] uppercase select-none">
            <span class="w-8 h-[2px] bg-[#E50914]"></span>
            <span>Next-Gen Content Infrastructure</span>
          </div>
          
          <!-- Durer Proportional Title coupled with Radio Grotesk Accent -->
          <h1 class="durer-heading text-[11.5vw] sm:text-[9.5rem] lg:text-[11.5rem] text-[#111111] uppercase select-none tracking-[0.01em] leading-[0.88]">
            Digital <br />
            <span class="flex items-baseline gap-4 sm:gap-8 flex-wrap mt-2 sm:mt-4">
              <span>Infrastructure</span>
              <span class="font-display text-[6.5vw] sm:text-[5.5rem] lg:text-[6.5rem] font-black tracking-[-0.02em] text-[#E50914] normal-case block sm:inline">
                for Content.
              </span>
            </span>
          </h1>

          <div class="mt-14 sm:mt-20 grid md:grid-cols-12 gap-8 items-end border-t border-[#111111]/20 pt-8">
            <p class="md:col-span-7 font-display text-xl sm:text-2xl text-[#333333] font-semibold leading-relaxed tracking-[-0.01em]">
              We discarded conversational guesswork for empirical precision. Klarix ingests engagement analytics, diagnoses frame-by-frame retention fractures, and engineers algorithmic dominance.
            </p>
            <div class="md:col-span-5 flex md:justify-end items-center pb-1">
              <a href="#engine-section" class="interactive-hover inline-flex items-center gap-3 font-display text-xs sm:text-sm font-extrabold uppercase tracking-[0.2em] text-[#111111] hover:text-[#E50914] transition-colors duration-300 group select-none">
                <span>Scroll Down</span>
                <span class="inline-block text-[#E50914] text-base font-black animate-bounce group-hover:translate-y-0.5 transition-transform">↓</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Scrollytelling Camera Aperture Transition -->
      <div ref="bannerContainerRef" class="relative z-20 w-full pt-8 pb-28 sm:pb-40 bg-[#F9F9FA]">
        <div class="max-w-[96rem] mx-auto overflow-hidden px-4 sm:px-0">
          <div ref="heroBannerRef" class="w-full h-[65vh] sm:h-[85vh] md:h-[92vh] relative overflow-hidden bg-[#0A0B0E] shadow-[0_30px_90px_rgba(17,17,17,0.18)] border border-[#111111]/10 rounded-2xl">
            <img
              src="/assets/ChatGPT Image Aug 1, 2026, 01_11_59 PM.png"
              alt="Daylight office desktop showcasing Klarix precision OS"
              class="w-full h-full object-cover filter contrast-[1.03] brightness-[1.02]"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            
            <div class="absolute bottom-10 left-8 sm:bottom-14 sm:left-14 max-w-2xl text-white">
              <div class="flex items-center gap-3 mb-3 font-display text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#E50914]">
                <span> WORKSPACE OS | LIVE DIAGNOSTICS</span>
              </div>
              <p class="font-durer text-3xl sm:text-5xl font-bold tracking-[0.01em] leading-[1.05]">
                Engineered for creators demanding institutional authority.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── B. THE ENGINE (STICKY STACKING CARDS WITH EXPLICIT LAYERED Z-INDEXING) ─── -->
    <section id="engine-section" class="relative w-full py-28 sm:py-40 bg-[#F9F9FA] px-6 sm:px-12 border-t border-[#111111]/15">
      <div class="max-w-[92rem] mx-auto">
        
        <div class="mb-20 sm:mb-28 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <!-- Massive Durer Section Header -->
            <h2 class="font-durer text-6xl sm:text-8xl font-black tracking-[0.01em] text-[#111111] uppercase leading-[0.9]">
              The <span class="text-[#E50914]">Engine.</span>
            </h2>
          </div>
          <p class="font-display text-lg sm:text-2xl text-[#444444] font-semibold max-w-lg leading-relaxed tracking-[-0.01em]">
            Three high-contrast neural cards stacked in sequence. Powered by real-time spatial analytics and intelligent scripting engines.
          </p>
        </div>

        <!-- Sticky Stacking Sequence -->
        <div class="relative w-full space-y-12 sm:space-y-16 pb-32">
          
          <!-- ─── CARD 1: 3-Node Intelligence (z-10) ─── -->
          <div
            ref="card1Ref"
            class="interactive-hover sticky top-[12vh] z-10 w-full min-h-[74vh] rounded-2xl liquid-glass-dark-pane text-white p-8 sm:p-14 lg:p-20 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[0_35px_100px_rgba(0,0,0,0.45)]"
          >
            <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-45">
              <svg class="absolute inset-0 w-full h-full animate-grid-drift opacity-60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="card1-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
                    <circle cx="0" cy="0" r="1" fill="rgba(255, 255, 255, 0.2)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#card1-grid)" />
              </svg>
              <svg class="absolute -top-32 -left-32 w-[650px] h-[650px] animate-spin-slow opacity-80" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="300" cy="300" r="260" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="8 12" />
                <circle cx="300" cy="300" r="220" stroke="rgba(229,9,20,0.4)" stroke-width="1.5" stroke-dasharray="140 60 40 40" />
                <circle cx="300" cy="300" r="170" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
                <circle cx="300" cy="300" r="110" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="4 8" />
                <circle cx="300" cy="80" r="4" fill="#E50914" class="animate-cyber-pulse" />
              </svg>
              <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(229,9,20,0.12)_0%,transparent_65%)]"></div>
            </div>

            <div class="relative z-10 grid lg:grid-cols-12 gap-12 sm:gap-16 items-center h-full">
              <div class="lg:col-span-5 flex flex-col justify-between h-full py-2">
                <div>
                  <div class="flex items-center gap-4 mb-8">
                    <!-- Durer Node Number -->
                    <span class="text-6xl sm:text-7xl font-durer font-extrabold text-[#E50914] tracking-normal select-none">01</span>
                    <span class="h-8 w-[2px] bg-white/20"></span>
                    <span class="font-display text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase text-white/80">Perception Node</span>
                  </div>
                  <!-- Radio Grotesk Title with clean spacing -->
                  <h3 class="font-display text-4xl sm:text-6xl font-extrabold tracking-[-0.02em] leading-[0.94] text-white mb-6">
                    3-Node <br />Intelligence
                  </h3>
                  <p class="font-display text-white/80 text-lg sm:text-xl leading-relaxed font-normal tracking-[-0.01em]">
                    Our proprietary tri-node architecture separates content assessment into visual geometry, cognitive retention curve tracking, and semantic hook strength. Zero synthetic assumptions; pure diagnostic reality.
                  </p>
                </div>

                <!-- Upgraded Metrics in Pure Radio Grotesk -->
                <div class="mt-12 pt-8 border-t border-white/15 flex items-center justify-between">
                  <div>
                    <span class="font-display text-xs sm:text-sm text-white/70 block font-bold mb-1 tracking-[0.14em] uppercase">Execution Velocity</span>
                    <span class="font-display text-2xl sm:text-4xl font-black text-white tracking-[-0.02em]">&lt; 240ms / Frame</span>
                  </div>
                  <div class="px-5 py-2 rounded-lg bg-[#E50914] text-white text-xs font-display font-black tracking-[0.14em] uppercase shadow-[0_0_25px_rgba(229,9,20,0.4)] border border-white/20">
                    ACTIVE NODE
                  </div>
                </div>
              </div>

              <div class="lg:col-span-7 relative flex justify-center">
                <div class="w-full rounded-xl overflow-hidden bg-[#151720]/80 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.65)] relative group">
                  <img
                    src="/assets/ChatGPT Image Aug 1, 2026, 01_19_08 PM.png"
                    alt="3-Node Intelligence Pipeline"
                    class="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700 filter contrast-[1.05]"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- ─── CARD 2: Predictive Analytics (z-20 overstacking Card 1) ─── -->
          <div
            ref="card2Ref"
            class="interactive-hover sticky top-[15vh] z-20 w-full min-h-[74vh] rounded-2xl liquid-glass-dark-pane text-white p-8 sm:p-14 lg:p-20 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[0_45px_110px_rgba(0,0,0,0.55)]"
          >
            <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-50">
              <svg class="absolute -bottom-40 -right-40 w-[750px] h-[750px] animate-spin-reverse-slow opacity-70" viewBox="0 0 700 700" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="350" cy="350" r="330" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
                <circle cx="350" cy="350" r="280" stroke="rgba(229,9,20,0.3)" stroke-width="1.5" stroke-dasharray="80 40 200 60" />
                <circle cx="350" cy="350" r="220" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="6 12" />
                <circle cx="350" cy="350" r="160" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
                <circle cx="70" cy="350" r="5" fill="#FFFFFF" class="animate-cyber-pulse" />
                <circle cx="350" cy="630" r="5" fill="#E50914" class="animate-cyber-pulse" />
              </svg>
              <svg class="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="card2-lines" width="100%" height="24" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="24" x2="100%" y2="24" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="4 8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#card2-lines)" />
              </svg>
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05)_0%,transparent_65%)]"></div>
            </div>

            <div class="relative z-10 grid lg:grid-cols-12 gap-12 sm:gap-16 items-center h-full">
              <div class="lg:col-span-5 flex flex-col justify-between h-full py-2">
                <div>
                  <div class="flex items-center gap-4 mb-8">
                    <span class="text-6xl sm:text-7xl font-durer font-extrabold text-[#E50914] tracking-normal select-none">02</span>
                    <span class="h-8 w-[2px] bg-white/20"></span>
                    <span class="font-display text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase text-white/80">Correlation Node</span>
                  </div>
                  <h3 class="font-display text-4xl sm:text-6xl font-extrabold tracking-[-0.02em] leading-[0.94] text-white mb-6">
                    Predictive <br />Analytics
                  </h3>
                  <p class="font-display text-white/80 text-lg sm:text-xl leading-relaxed font-normal tracking-[-0.01em]">
                    Correlate audience drop-off timestamps directly against cutting velocity and intonation spikes. Know with empirical precision exactly which second fractures virality prior to publishing.
                  </p>
                </div>

                <div class="mt-12 pt-8 border-t border-white/15 flex items-center justify-between">
                  <div>
                    <span class="font-display text-xs sm:text-sm text-white/70 block font-bold mb-1 tracking-[0.14em] uppercase">Retention Accuracy</span>
                    <span class="font-display text-2xl sm:text-4xl font-black text-white tracking-[-0.02em]">94.8% Validated</span>
                  </div>
                  <div class="px-5 py-2 rounded-lg bg-white/15 border border-white/25 text-white text-xs font-display font-black tracking-[0.14em] uppercase">
                    CORRELATING
                  </div>
                </div>
              </div>

              <div class="lg:col-span-7 relative flex justify-center">
                <div class="w-full rounded-xl overflow-hidden bg-[#181A24]/80 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.65)] group">
                  <img
                    src="/assets/ChatGPT Image Aug 1, 2026, 01_27_08 PM.png"
                    alt="Predictive Analytics Retention Scoring UI"
                    class="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700 filter contrast-[1.05]"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- ─── CARD 3: Viral Scriptwriter (z-30 overstacking Card 2) ─── -->
          <div
            ref="card3Ref"
            class="interactive-hover sticky top-[18vh] z-30 w-full min-h-[74vh] rounded-2xl liquid-glass-dark-pane text-white p-8 sm:p-14 lg:p-20 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[0_55px_130px_rgba(0,0,0,0.65)]"
          >
            <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-45">
              <svg class="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="card3-hex" width="56" height="96" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
                    <path d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z" fill="none" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1"/>
                    <path d="M28 64 L56 80 L56 112 L28 128 L0 112 L0 80 Z" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1"/>
                    <circle cx="28" cy="0" r="1.5" fill="rgba(229, 9, 20, 0.4)" />
                    <circle cx="28" cy="64" r="1" fill="rgba(255, 255, 255, 0.3)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#card3-hex)" />
              </svg>
              <svg class="absolute top-0 right-0 w-[600px] h-[600px] animate-spin-slow opacity-60" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="250" cy="250" r="200" stroke="rgba(229,9,20,0.35)" stroke-width="1" stroke-dasharray="100 200 50 50" />
                <circle cx="250" cy="250" r="140" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
              </svg>
              <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(229,9,20,0.15)_0%,transparent_60%)]"></div>
            </div>

            <div class="relative z-10 grid lg:grid-cols-12 gap-12 sm:gap-16 items-center h-full">
              <div class="lg:col-span-5 flex flex-col justify-between h-full py-2">
                <div>
                  <div class="flex items-center gap-4 mb-8">
                    <span class="text-6xl sm:text-7xl font-durer font-extrabold text-[#E50914] tracking-normal select-none">03</span>
                    <span class="h-8 w-[2px] bg-white/20"></span>
                    <span class="font-display text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase text-white/80">Synthesis Node</span>
                  </div>
                  <h3 class="font-display text-4xl sm:text-6xl font-extrabold tracking-[-0.02em] leading-[0.94] text-white mb-6">
                    Viral <br />Scriptwriter
                  </h3>
                  <p class="font-display text-white/80 text-lg sm:text-xl leading-relaxed font-normal tracking-[-0.01em]">
                    Do not merely diagnose fractures; receive instant high-converting script reconstructions. Complete with kinetic B-roll stage cues, pacing cadences, and hook alternatives engineered for exponential reach.
                  </p>
                </div>

                <div class="mt-12 pt-8 border-t border-white/15 flex items-center justify-between">
                  <div>
                    <span class="font-display text-xs sm:text-sm text-white/70 block font-bold mb-1 tracking-[0.14em] uppercase">Distribution Impact</span>
                    <span class="font-display text-2xl sm:text-4xl font-black text-[#E50914] tracking-[-0.02em]">10.4x Multiplier</span>
                  </div>
                  <div class="px-5 py-2 rounded-lg bg-[#E50914] text-white text-xs font-display font-black tracking-[0.14em] uppercase shadow-[0_0_25px_rgba(229,9,20,0.4)] border border-white/20">
                    GENERATING
                  </div>
                </div>
              </div>

              <div class="lg:col-span-7 relative flex justify-center">
                <div class="w-full rounded-xl overflow-hidden bg-[#1B1E2B]/80 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.65)] group">
                  <img
                    src="/assets/ChatGPT Image Aug 1, 2026, 01_30_09 PM.png"
                    alt="Viral Scriptwriter Reconstruction Dashboard"
                    class="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700 filter contrast-[1.05]"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ─── C. BENTO GRID ECOSYSTEM ─── -->
    <section id="bento-section" class="relative w-full py-28 sm:py-40 bg-[#F2F4F7] px-6 sm:px-12 border-t border-[#111111]/15">
      <div class="max-w-[92rem] mx-auto">
        
        <div class="mb-20 sm:mb-24 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <span class="text-xs sm:text-sm font-display font-extrabold uppercase tracking-[0.2em] text-[#E50914] block mb-3">
              ECOSYSTEM & DEPLOYMENT
            </span>
            <!-- Durer Colossal Header -->
            <h2 class="font-durer text-6xl sm:text-8xl font-black tracking-[0.01em] text-[#111111] uppercase leading-[0.9]">
              The <span class="text-[#E50914]">Ecosystem.</span>
            </h2>
          </div>
          <div class="text-right font-display">
            <span class="text-xs sm:text-sm text-[#777777] font-bold uppercase tracking-[0.15em] block mb-1">Cross-Platform Synchronization</span>
            <span class="text-xl sm:text-2xl font-black text-[#111111] uppercase tracking-[-0.01em]">Zero Software Overhead</span>
          </div>
        </div>

        <!-- Asymmetrical Bento Grid Composition -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
          
          <!-- LARGE CELL: 8 cols -->
          <div
            :ref="setBentoCellRef"
            class="interactive-hover md:col-span-8 group relative rounded-2xl overflow-hidden bg-[#111111] border border-[#111111]/15 shadow-[0_15px_50px_rgba(0,0,0,0.08)] min-h-[520px] flex flex-col justify-end p-8 sm:p-14 text-white"
          >
            <img
              src="/assets/Creator_working_on_laptop_2K_202608011244.jpeg"
              alt="Creator working on laptop in natural lighting"
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter contrast-[1.05]"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
            
            <div class="relative z-10 max-w-2xl">
              <span class="inline-block font-display font-extrabold text-xs uppercase tracking-[0.2em] text-[#E50914] mb-3">
                Natural Creative Environments
              </span>
              <h3 class="font-durer text-3xl sm:text-5xl font-bold tracking-[0.01em] leading-[1.05]">
                Engineered for velocity where inspiration actually strikes.
              </h3>
              <p class="font-display text-white/80 text-lg sm:text-xl mt-4 leading-relaxed font-normal">
                No bloated desktop suites or cumbersome rendering pipelines. Execute deep frame diagnostics directly in browser across any natural environment.
              </p>
            </div>
          </div>

          <!-- TALL CELL: 4 cols -->
          <div
            :ref="setBentoCellRef"
            class="interactive-hover md:col-span-4 group relative rounded-2xl overflow-hidden liquid-glass-dark-pane border border-white/15 shadow-[0_15px_50px_rgba(0,0,0,0.15)] min-h-[520px] flex flex-col justify-between p-8 sm:p-12 text-white"
          >
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-2 font-display">
                <span class="text-xs uppercase font-extrabold tracking-widest text-[#E50914]">MOBILE SUITE</span>
                <span class="text-xs text-white/60 font-bold">REALTIME OS</span>
              </div>
              <h3 class="font-durer text-2xl sm:text-4xl font-bold tracking-[0.01em] leading-tight">
                Instant Pocket Diagnostics
              </h3>
            </div>

            <div class="relative z-0 my-6 flex-1 flex items-center justify-center overflow-hidden rounded-xl border border-white/15">
              <img
                src="/assets/Hands_holding_smartphone_with_app_202608011246.jpeg"
                alt="Hands holding smartphone running Klarix app"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter contrast-[1.05]"
              />
            </div>

            <div class="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between font-display">
              <span class="text-xs text-white/70 font-bold uppercase tracking-wider">iOS & Android Realtime</span>
              <span class="text-lg font-black text-[#E50914] group-hover:translate-x-1 transition-transform duration-200">→</span>
            </div>
          </div>

          <!-- WIDE CELL: 12 cols -->
          <div
            :ref="setBentoCellRef"
            class="interactive-hover md:col-span-12 group relative rounded-2xl overflow-hidden liquid-glass-pane shadow-[0_15px_50px_rgba(0,0,0,0.06)] min-h-[480px] grid md:grid-cols-12 items-stretch"
          >
            <div class="md:col-span-5 p-8 sm:p-16 flex flex-col justify-center order-2 md:order-1 z-10">
              <span class="font-display text-xs font-extrabold uppercase tracking-[0.2em] text-[#E50914] mb-3 block">
                INSTITUTIONAL DOMINANCE
              </span>
              <h3 class="font-durer text-4xl sm:text-6xl font-bold tracking-[0.01em] text-[#111111] leading-[0.98] mb-6">
                Turn Random Posts into Predictable Equity.
              </h3>
              <p class="font-display text-[#555555] text-lg sm:text-xl font-medium leading-relaxed mb-8">
                Visualize audience emotional mechanics and cognitive retention curves with crystal clarity. Eradiate empirical blind spots across your entire media footprint.
              </p>
              <div>
                <RouterLink
                  to="/demo"
                  class="inline-flex items-center gap-3 font-extrabold font-display text-xs uppercase tracking-[0.15em] text-[#111111] pb-2 border-b-2 border-[#111111] hover:border-[#E50914] hover:text-[#E50914] transition-colors duration-200 group/link"
                >
                  <span>Explore Interactive Ecosystem</span>
                  <span class="text-base group-hover/link:translate-x-1 transition-transform">↗</span>
                </RouterLink>
              </div>
            </div>

            <div class="md:col-span-7 h-full w-full order-1 md:order-2 overflow-hidden min-h-[350px] relative bg-[#111111]">
              <img
                src="/assets/ChatGPT Image Aug 1, 2026, 01_34_09 PM.png"
                alt="Laptop displaying Klarix surrounded by crystalline structures"
                class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter contrast-[1.05]"
              />
              <div class="absolute inset-0 bg-gradient-to-r from-white/90 via-transparent to-transparent md:block hidden opacity-30"></div>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- ─── D. FOOTER / CTA ─── -->
    <section id="cta-footer" class="relative w-full min-h-[90vh] bg-[#F9F9FA] flex flex-col justify-between pt-28 sm:pt-40 overflow-hidden border-t border-[#111111]/15">
      <div class="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <video
          autoplay
          muted
          loop
          playsinline
          class="w-full h-full object-cover opacity-100 filter contrast-[1.18] brightness-[1.04] saturate-[1.4]"
        >
          <source src="/assets/original-a48145102050445486fad0af031d917c.mp4" type="video/mp4" />
        </video>
        <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F9F9FA] to-transparent opacity-50"></div>
      </div>

      <div class="relative z-10 max-w-[92rem] mx-auto px-6 sm:px-12 w-full text-center mb-20">
        
        <div class="flex items-center justify-center gap-3 font-display text-xs sm:text-sm font-black tracking-[0.25em] text-[#111111] uppercase mb-8">
          <span class="w-6 h-[2px] bg-[#E50914]"></span>
          <span>INITIATE YOUR GROWTH ARC</span>
          <span class="w-6 h-[2px] bg-[#E50914]"></span>
        </div>
        
        <p class="font-durer text-3xl sm:text-5xl font-bold text-[#111111] max-w-3xl mx-auto tracking-[0.01em] leading-[1.15]">
          Stop gambling hours on content that dissolves into algorithmic voids. Let Klarix diagnose and script your breakout traction today.
        </p>
        
        <div class="mt-12 flex justify-center">
          <RouterLink
            to="/analyse"
            class="interactive-hover px-14 py-6 rounded-xl bg-[#E50914] text-white text-lg sm:text-xl font-display font-black tracking-[-0.02em] uppercase shadow-[0_20px_50px_rgba(229,9,20,0.35)] hover:bg-[#111111] transition-all duration-300 flex items-center gap-4 group hover:scale-105 active:scale-95 border border-white/20"
          >
            <span>Analyse First Post Free</span>
            <span class="text-2xl group-hover:translate-x-1.5 transition-transform font-black">→</span>
          </RouterLink>
        </div>
      </div>

      <div ref="footerTextRef" class="relative z-10 w-full px-6 sm:px-12 mt-auto overflow-hidden text-center select-none pb-6">
        <div class="border-t border-[#111111]/15 pt-12 pb-8 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-[92rem] mx-auto font-display text-xs sm:text-sm font-bold text-[#555555] uppercase tracking-[0.1em]">
          <div class="flex items-center gap-3">
            <span class="font-black text-[#111111]">© 2026 KLARIX INC.</span>
            <span>ALL RIGHTS RESERVED.</span>
          </div>
          <div class="flex items-center gap-8 font-extrabold">
            <a href="#" class="interactive-hover hover:text-[#E50914] transition-colors">Privacy Policy</a>
            <a href="#" class="interactive-hover hover:text-[#E50914] transition-colors">Terms of Service</a>
            <a href="#" class="interactive-hover hover:text-[#E50914] transition-colors">Security OS</a>
            <a href="https://linkedin.com" target="_blank" class="interactive-hover hover:text-[#E50914] transition-colors">LinkedIn</a>
          </div>
        </div>

        <!-- Colossal Footer Statement: START in Durer, SCALING in Radio Grotesk -->
        <h2 class="text-[15.5vw] font-black tracking-[0.02em] leading-[0.82] w-full block uppercase">
          <span class="font-durer text-white">START </span>
          <span class="font-display text-[#E50914] tracking-[-0.03em]">SCALING.</span>
        </h2>
      </div>
    </section>

  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  .editorial-heading, .durer-heading {
    word-break: break-word;
  }
}
</style>
