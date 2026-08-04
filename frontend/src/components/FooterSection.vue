<script setup>
</script>

<template>
  <footer class="relative bg-white border-t border-[#E5E5E5]">
    <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
      <!-- Top Section: Brand + Navigation -->
      <div class="grid md:grid-cols-4 gap-12 pb-12 border-b border-[#F0F0F0]">
        <!-- Brand Column -->
        <div class="md:col-span-1">
          <div class="flex items-center gap-2.5 mb-4">
            <img src="/brand_logo.jpeg" alt="Klarix Logo" class="h-8 w-auto object-contain rounded-lg" />
            <span class="font-display font-bold text-xl tracking-[-0.035em] text-[#0A0A0A]">Klarix</span>
          </div>
          <p class="text-sm text-[#525252] leading-relaxed max-w-xs">
            AI-powered content intelligence engine. Stop guessing, start growing.
          </p>
          <p class="mt-4 text-xs font-semibold text-[#CDFF00] bg-[#0A0A0A] inline-block px-3 py-1 rounded-full">
            Built by Piyush Maharana · IIT Madras
          </p>
        </div>

        <!-- Product Links -->
        <div>
          <h4 class="text-sm font-semibold font-display text-[#0A0A0A] mb-4 tracking-wide uppercase">Product</h4>
          <ul class="space-y-3">
            <li><a href="#how-it-works" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">How It Works</a></li>
            <li><a href="#ai-engine" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">AI Engine</a></li>
            <li><a href="#metrics" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">Results</a></li>
            <li><router-link to="/demo" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">Demo</router-link></li>
          </ul>
        </div>

        <!-- Company Links -->
        <div>
          <h4 class="text-sm font-semibold font-display text-[#0A0A0A] mb-4 tracking-wide uppercase">Company</h4>
          <ul class="space-y-3">
            <li><router-link to="/about" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">About</router-link></li>
            <li><a href="#" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">Blog</a></li>
            <li><a href="#" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">Careers</a></li>
            <li><a href="#" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">Contact</a></li>
          </ul>
        </div>

        <!-- Social Links -->
        <div>
          <h4 class="text-sm font-semibold font-display text-[#0A0A0A] mb-4 tracking-wide uppercase">Connect</h4>
          <ul class="space-y-3">
            <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              Instagram
            </a></li>
            <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              LinkedIn
            </a></li>
            <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" class="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              GitHub
            </a></li>
          </ul>
        </div>
      </div>

      <!-- Bottom Row: Copyright & Legal -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-[#A3A3A3]">
        <p>© 2026 Klarix, Inc. All rights reserved.</p>
        <div class="flex flex-wrap items-center gap-6">
          <a href="#" class="hover:text-[#0A0A0A] transition-colors">Privacy Policy</a>
          <a href="#" class="hover:text-[#0A0A0A] transition-colors">Terms of Service</a>
          <a href="#" class="hover:text-[#0A0A0A] transition-colors">Cookie Policy</a>
          <a href="#" class="hover:text-[#0A0A0A] transition-colors">Security</a>
        </div>
      </div>
    </div>
  </footer>
</template>
