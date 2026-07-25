<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import ScrollyTellingBackground from '../components/ScrollyTellingBackground.vue'
import SvgBackground from '../components/SvgBackground.vue'

const isLoaded = ref(false)
onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 150)
})
</script>

<template>
  <div 
    class="relative w-full font-body selection:bg-indigo-500/20 overflow-x-hidden min-h-screen transition-colors duration-300"
    style="color: var(--text-primary, #0F172A); background-color: var(--page-bg, #F0F4F8);"
  >
    <!-- Rotating & Vertical Scrolling 3D Skeuomorphic Globe Background with Galaxy Transformation -->
    <SvgBackground />

    <!-- Sleek Minimalist Glass 3D Showcase Pod (No text, smoothed blended edges) -->
    <ScrollyTellingBackground />

    <!-- Floating Glassmorphism Navbar -->
    <NavBar />

    <!-- Main Content Layers (Dedicated Scrollytelling Narrative Track on Desktop) -->
    <main class="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-12">
      
      <!-- HERO SECTION -->
      <section class="min-h-[95vh] flex flex-col justify-center pt-28 md:pt-36 pb-20 w-full lg:w-[56%] text-center lg:text-left items-center lg:items-start">
        <h1 
          class="text-5xl sm:text-6xl md:text-7xl lg:text-[4.5rem] xl:text-[5rem] font-extrabold font-display tracking-[-0.04em] leading-[1.08] mb-6 drop-shadow-sm transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-32 sm:-translate-x-64 opacity-0'"
          style="color: var(--text-primary, #0F172A);"
        >
          Stop guessing why your <br class="hidden sm:inline"/>
          posts <span class="text-rose-600 font-extrabold">aren't growing.</span>
        </h1>
        
        <p 
          class="mt-2 text-lg sm:text-xl md:text-2xl font-normal tracking-[-0.015em] max-w-xl leading-relaxed transition-all duration-[900ms] delay-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-24 sm:-translate-x-48 opacity-0'"
          style="color: var(--text-secondary, #475569);"
        >
          Upload your content. Paste your stats. Klarix tells you exactly what to fix &mdash; and writes your next post.
        </p>

        <div 
          class="mt-10 mb-12 transition-all duration-[900ms] delay-[300ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'"
        >
          <RouterLink 
            to="/analyse" 
            class="group relative inline-flex items-center justify-center px-9 py-4 text-lg font-semibold tracking-tight text-white transition-all duration-300 bg-indigo-600 rounded-full shadow-[0_12px_30px_rgba(79,70,229,0.3)] hover:bg-indigo-500 hover:shadow-[0_16px_38px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"
          >
            Analyse My Post Free <span class="ml-2 transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
          </RouterLink>
        </div>
      </section>

      <!-- PROBLEM SECTION -->
      <section id="why-klarix" class="py-24 w-full lg:w-[56%] flex flex-col justify-center text-center lg:text-left items-center lg:items-start">
        <div class="w-full space-y-10">
          <h2 
            class="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold leading-[1.1] tracking-[-0.035em] transition-colors duration-300"
            style="color: var(--text-primary, #0F172A);"
          >
            You post.<br/>
            <span class="text-rose-600">You guess.</span><br/>
            You repeat.
          </h2>
          
          <div 
            class="backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:shadow-[0_0_35px_rgba(244,63,94,0.45),_0_0_15px_rgba(99,102,241,0.4)] border-l-[5px] border-l-rose-500 hover:border-rose-400/80 text-left hover:-translate-y-1 transition-all duration-500 ease-out"
            style="background-color: var(--card-bg, rgba(255, 255, 255, 0.85)); border-color: var(--card-border, rgba(226, 232, 240, 0.8));"
          >
            <p 
              class="text-lg sm:text-xl md:text-2xl leading-relaxed font-normal tracking-[-0.01em] transition-colors duration-300"
              style="color: var(--text-secondary, #475569);"
            >
              Most founders spend hours creating content, get confusing numbers back, and have no idea what to change. So they post again and repeat the exact same mistakes.
            </p>
          </div>
        </div>
      </section>

      <!-- HOW IT WORKS (Vertical Scrollytelling Pipeline) -->
      <section id="how-it-works" class="py-24 w-full lg:w-[56%] flex flex-col justify-center text-left">
        <h2 
          class="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold mb-16 tracking-[-0.035em] text-center lg:text-left transition-colors duration-300"
          style="color: var(--text-primary, #0F172A);"
        >
          How it works
        </h2>
        
        <div class="space-y-8 w-full">
          <div 
            class="p-8 sm:p-10 rounded-[2rem] backdrop-blur-2xl border shadow-[0_15px_40px_rgba(0,0,0,0.1)] hover:shadow-[0_0_38px_rgba(99,102,241,0.55),_0_0_16px_rgba(168,85,247,0.45)] hover:border-indigo-400/80 transition-all duration-500 ease-out hover:-translate-y-1.5 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start"
            style="background-color: var(--card-bg, rgba(255, 255, 255, 0.85)); border-color: var(--card-border, rgba(226, 232, 240, 0.8));"
          >
            <div class="text-5xl sm:text-6xl font-display font-extrabold text-indigo-500 shrink-0 font-mono opacity-80">1</div>
            <div>
              <h3 
                class="text-2xl font-extrabold mb-3 tracking-[-0.02em] transition-colors duration-300"
                style="color: var(--text-primary, #0F172A);"
              >Upload Content</h3>
              <p 
                class="text-base md:text-lg leading-relaxed font-normal transition-colors duration-300"
                style="color: var(--text-secondary, #475569);"
              >Upload your reel, carousel, or static post directly into our high-speed analysis engine.</p>
            </div>
          </div>
          
          <div 
            class="p-8 sm:p-10 rounded-[2rem] backdrop-blur-2xl border shadow-[0_15px_40px_rgba(0,0,0,0.1)] hover:shadow-[0_0_38px_rgba(99,102,241,0.55),_0_0_16px_rgba(168,85,247,0.45)] hover:border-indigo-400/80 transition-all duration-500 ease-out hover:-translate-y-1.5 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start"
            style="background-color: var(--card-bg, rgba(255, 255, 255, 0.85)); border-color: var(--card-border, rgba(226, 232, 240, 0.8));"
          >
            <div class="text-5xl sm:text-6xl font-display font-extrabold text-indigo-500 shrink-0 font-mono opacity-80">2</div>
            <div>
              <h3 
                class="text-2xl font-extrabold mb-3 tracking-[-0.02em] transition-colors duration-300"
                style="color: var(--text-primary, #0F172A);"
              >Provide Stats</h3>
              <p 
                class="text-base md:text-lg leading-relaxed font-normal transition-colors duration-300"
                style="color: var(--text-secondary, #475569);"
              >Paste your analytics (views, watch time, saves, reach) so our AI correlates your exact visual frames with viewer drop-offs.</p>
            </div>
          </div>

          <div 
            class="p-8 sm:p-10 rounded-[2rem] backdrop-blur-2xl border shadow-[0_15px_40px_rgba(0,0,0,0.1)] hover:shadow-[0_0_38px_rgba(99,102,241,0.55),_0_0_16px_rgba(168,85,247,0.45)] hover:border-indigo-400/80 transition-all duration-500 ease-out hover:-translate-y-1.5 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start"
            style="background-color: var(--card-bg, rgba(255, 255, 255, 0.85)); border-color: var(--card-border, rgba(226, 232, 240, 0.8));"
          >
            <div class="text-5xl sm:text-6xl font-display font-extrabold text-indigo-500 shrink-0 font-mono opacity-80">3</div>
            <div>
              <h3 
                class="text-2xl font-extrabold mb-3 tracking-[-0.02em] transition-colors duration-300"
                style="color: var(--text-primary, #0F172A);"
              >Get Strategy & Script</h3>
              <p 
                class="text-base md:text-lg leading-relaxed font-normal transition-colors duration-300"
                style="color: var(--text-secondary, #475569);"
              >Receive your diagnostic teardown plus a high-converting, ready-to-record replacement script tailored to your bottleneck.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- EXAMPLE OUTPUT TEASER -->
      <section id="diagnostic-pipeline" class="py-24 w-full lg:w-[56%] flex flex-col justify-center text-center lg:text-left">
        <div 
          class="backdrop-blur-2xl p-10 sm:p-14 md:p-14 rounded-[2.5rem] border shadow-[0_25px_80px_-15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_42px_rgba(99,102,241,0.6),_0_0_18px_rgba(168,85,247,0.5)] hover:border-indigo-400/80 relative overflow-hidden text-left hover:-translate-y-1.5 transition-all duration-500 ease-out"
          style="background-color: var(--card-bg, rgba(255, 255, 255, 0.9)); border-color: var(--card-border, rgba(226, 232, 240, 0.9));"
        >
          <div class="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none"></div>
          <div class="absolute -bottom-32 -left-32 w-64 h-64 bg-rose-500/15 rounded-full blur-2xl pointer-events-none"></div>
          
          <h2 
            class="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold mb-6 tracking-[-0.035em] transition-colors duration-300"
            style="color: var(--text-primary, #0F172A);"
          >
            See exactly what Klarix produces.
          </h2>
          <p 
            class="text-lg md:text-xl mb-10 font-normal tracking-[-0.01em] leading-relaxed transition-colors duration-300"
            style="color: var(--text-secondary, #475569);"
          >
            We ran a real founder's post through our specialized 3-agent diagnostic pipeline. Experience the depth of insights.
          </p>
          <RouterLink 
            to="/demo" 
            class="inline-flex items-center justify-center px-9 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-semibold tracking-tight transition-all duration-200 shadow-[0_10px_25px_rgba(79,70,229,0.35)] hover:shadow-[0_15px_35px_rgba(79,70,229,0.45)] hover:-translate-y-0.5 active:translate-y-0"
          >
            See the full demo &rarr;
          </RouterLink>
        </div>
      </section>

      <!-- SOCIAL PROOF -->
      <section id="social-proof" class="py-20 w-full lg:w-[56%] flex flex-col justify-center text-center lg:text-left">
        <h2 
          class="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold mb-12 tracking-[-0.035em] transition-colors duration-300"
          style="color: var(--text-primary, #0F172A);"
        >
          Social Proof
        </h2>
        <div 
          class="grid sm:grid-cols-2 gap-8 items-center backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border shadow-md hover:shadow-[0_0_38px_rgba(99,102,241,0.55),_0_0_16px_rgba(168,85,247,0.45)] hover:border-indigo-400/80 hover:-translate-y-1.5 transition-all duration-500 ease-out"
          style="background-color: var(--card-bg, rgba(255, 255, 255, 0.8)); border-color: var(--card-border, rgba(226, 232, 240, 0.8));"
        >
          <div 
            class="text-2xl md:text-3xl font-medium tracking-tight text-left transition-colors duration-300"
            style="color: var(--text-primary, #334155);"
          >
            Used by many founders
          </div>
          <div class="border-l-[4px] border-indigo-500 pl-6 text-left">
            <p 
              class="italic text-base sm:text-lg md:text-xl leading-relaxed transition-colors duration-300"
              style="color: var(--text-secondary, #334155);"
            >
             “Klarix transformed my content strategy. I finally know what actually works.”
            </p>
          </div>
        </div>
      </section>

    </main>

    <!-- SOLID EDGE-TO-EDGE SHARP FOOTER AT BOTTOM OF PAGE -->
    <footer class="w-full border-t border-slate-800/80 bg-[#050811] relative z-20 text-slate-200">
      <div class="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 py-8 flex flex-col gap-6">
        
        <!-- Top Row: Brand Info & Exclusively Social Links -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800/60 text-center sm:text-left">
          <!-- Brand Logo & Creator Statement -->
          <div class="flex items-center gap-3">
            <img src="/brand_logo.jpeg" alt="Klarix Logo" class="h-8 w-auto object-contain rounded-lg shadow-sm" />
            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
              <span class="font-display font-bold text-xl text-white tracking-[-0.035em]">Klarix</span>
              <span class="hidden sm:inline text-slate-600 font-bold">&middot;</span>
              <span class="text-xs font-semibold text-indigo-400">Built by @piyush._maharana (IIT Madras)</span>
            </div>
          </div>

          <!-- Social Links (Exclusively Instagram, LinkedIn, GitHub) -->
          <div class="flex items-center gap-6 text-sm font-bold text-white">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="hover:text-indigo-400 transition-colors">Instagram</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" class="hover:text-indigo-400 transition-colors">LinkedIn</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" class="hover:text-indigo-400 transition-colors">GitHub</a>
          </div>
        </div>

        <!-- Bottom Row: Copyright & Legal Policies -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <p>&copy; 2026 Klarix, Inc. All rights reserved.</p>
          <div class="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <a href="#" class="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" class="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" class="hover:text-white transition-colors">Cookie Policy</a>
            <a href="#" class="hover:text-white transition-colors">Security</a>
          </div>
        </div>

      </div>
    </footer>
  </div>
</template>
