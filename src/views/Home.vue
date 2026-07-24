<script setup>
import { RouterLink } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import ScrollyTellingBackground from '../components/ScrollyTellingBackground.vue'
</script>

<template>
  <div class="relative w-full text-white font-body selection:bg-indigo-500/30">
    <!-- Scrollytelling Background -->
    <ScrollyTellingBackground />
    
    <!-- Background Dimming Overlay for Readability -->
    <div class="fixed inset-0 bg-black/60 pointer-events-none z-[1]"></div>

    <!-- Navbar -->
    <NavBar />

    <!-- Content Layers -->
    <main class="relative z-10 w-full">
      
      <!-- HERO SECTION -->
      <section class="h-[120vh] flex flex-col items-center justify-center text-center px-4">
        <h1 class="text-6xl md:text-8xl font-bold font-display tracking-tight uppercase leading-tight max-w-4xl mx-auto drop-shadow-2xl">
          <span class="text-red-500">Stop</span> guessing why your <br/>
          posts <span class="text-red-500">aren't growing.</span>
        </h1>
        
        <p class="mt-8 text-xl text-gray-300 max-w-2xl mx-auto drop-shadow-lg">
          Upload your content. Paste your stats. Klarix tells you exactly what to fix &mdash; and writes your next post.
        </p>

        <div class="mt-12">
          <RouterLink 
            to="/analyse" 
            class="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
          >
            Analyse My Post Free &rarr;
          </RouterLink>
        </div>
      </section>

      <!-- PROBLEM SECTION -->
      <section class="h-[120vh] flex flex-col items-center justify-center px-4">
        <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div class="text-left">
            <h2 class="text-5xl md:text-6xl font-display font-bold mb-6 text-white leading-tight uppercase tracking-tight">
              You post.<br/>
              <span class="text-red-400">You guess.</span><br/>
              You repeat.
            </h2>
          </div>
          <div>
            <p class="text-2xl text-gray-300 leading-relaxed border-l-2 border-indigo-500/50 pl-8">
              Most founders spend hours creating content, get confusing numbers back, and have no idea what to change. So they post again and repeat the same mistakes.
            </p>
          </div>
        </div>
      </section>

      <!-- HOW IT WORKS -->
      <section class="h-[150vh] flex flex-col items-center justify-center px-4">
        <div class="max-w-6xl mx-auto w-full">
          <h2 class="text-4xl md:text-5xl font-display font-bold text-center mb-24 uppercase tracking-tight">How it works</h2>
          
          <div class="grid md:grid-cols-3 gap-8">
            <div class="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
              <div class="text-6xl font-display font-bold text-indigo-500/30 mb-6">01</div>
              <h3 class="text-2xl font-bold mb-4">Upload</h3>
              <p class="text-gray-400">Upload your reel, carousel, or static post directly to our engine.</p>
            </div>
            
            <div class="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
              <div class="text-6xl font-display font-bold text-indigo-500/30 mb-6">02</div>
              <h3 class="text-2xl font-bold mb-4">Provide Stats</h3>
              <p class="text-gray-400">Paste your analytics (views, watch time, saves, etc.) so we can correlate visual data with performance.</p>
            </div>

            <div class="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
              <div class="text-6xl font-display font-bold text-indigo-500/30 mb-6">03</div>
              <h3 class="text-2xl font-bold mb-4">Get Strategy</h3>
              <p class="text-gray-400">Get your full analysis + a ready-to-record script tailored to your exact bottleneck.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- EXAMPLE OUTPUT TEASER -->
      <section class="h-[100vh] flex flex-col items-center justify-center px-4 text-center">
        <div class="max-w-4xl w-full p-[1px] bg-gradient-to-b from-white/20 to-transparent rounded-3xl mx-auto">
          <div class="bg-black/40 backdrop-blur-xl p-12 rounded-3xl border border-white/10 shadow-2xl">
            <h2 class="text-3xl font-display font-bold mb-6 uppercase tracking-tight">See exactly what Klarix produces.</h2>
            <p class="text-gray-400 text-lg mb-10">We ran a real founder's post through the 3-agent pipeline.</p>
            <RouterLink 
              to="/demo" 
              class="inline-block px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
            >
              See the full demo &rarr;
            </RouterLink>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="h-[50vh] flex flex-col items-center justify-end pb-12 px-4 text-center">
        <div class="border-t border-white/10 pt-12 w-full max-w-4xl flex flex-col items-center text-sm text-gray-500">
          <img src="/brand_logo.jpeg" alt="Klarix Logo" class="h-8 w-auto object-contain mb-6 opacity-60 hover:opacity-100 transition-opacity" />
          <p class="mb-4 text-gray-400">Built by @piyush._maharana</p>
          <p class="mb-6">IIT Madras &middot; Data Science & AI</p>
          <div class="flex items-center justify-center gap-6">
            <a href="#" class="hover:text-white transition-colors">Instagram</a>
            <a href="#" class="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" class="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  </div>
</template>
