<script setup>
import { ref } from 'vue'
import FooterSection from '../components/FooterSection.vue'

const isTranscriptOpen = ref(false)
const copiedId = ref(null)
const activeTab = ref('all') // 'all' | 'visual' | 'strategy' | 'script'

// Copy Helper function
const copyText = (text, id) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null
    }, 3000)
  }
}

// Pre-assembled case study texts for copying
const copyWhatWorked = `• Direct eye-level framing in modern daylight studio establishes trust and professional authority.\n• Kinetic high-contrast white text subtitle ('DROP-OFFS WITH') positioned above chest level maintains focal eye engagement without obscuring lip articulation.\n• Save-to-view ratio (1.32%) is in the top 5th percentile for tech founders, signaling high educational utility.`

const copyWhatFailed = `• Camera angle remains locked in a static medium desk shot for the initial 6 seconds, leading to mild audience fatigue.\n• Lack of sound design / kinetic swoosh transitions between the problem setup and solution reveal.\n• CRITICAL DROP-OFF THRESHOLD // Timestamp 0:05: Viewers experienced visual stagnation before the b-roll cutaway. A camera angle switch or pattern interrupt was needed two seconds earlier.`

const copyStrategy = `Priority Fix: Implement an instant camera angle shift from medium desk shot to compressed close-up at timestamp 0:03, paired with a subtle zoom animation on emphasis words.\nFormat & Angle: Short-Form Reel · Contrarian Data Teardown\nHook Direction: Lead directly with a split-screen dashboard showing a red declining view graph before speaking.\nTrend Intelligence: Tech audiences in Q3 respond 3x faster to visual proof (code screens or CRM metrics) within the first 1.5 seconds than verbal promises.\nCompetitor Gap: Most AI automation creators talk in abstract theory. Showing actual terminal scripts or workflow diagrams creates unbeatable differentiation.\nPublishing Window: Tuesdays and Thursdays between 08:30 – 10:30 AM EST (Optimized for founder routines).\nExpected Velocity: 3.4x Organic Reach Growth (+180,000 Views on next iteration).`

const copyScript = `HOOK (0:00–0:03):\n"Stop filming 8-hour talking head videos that plateau at 200 views."\n\nBODY (0:03–0:22):\n"The problem isn't your hook—it's your structural editing after second five. Look at this retention heatmap: when you talk without switching camera focal points every four seconds, eighty percent of users scroll. Once we added kinetic text animations and split-screen telemetry to our videos, reach tripled in under two weeks."\n\nCALL TO ACTION (0:22–0:28):\n"Comment 'TELEMETRY' below and I'll dm you our open-source 3-agent video analysis engine."\n\nDYNAMIC TEXT OVERLAYS:\n1. 0:00–0:03: Large bold crimson banner: 'WHY REELS DIE AT 200 VIEWS'\n2. 0:05–0:10: Highlight box on retention drop graph: '80% SCROLL HERE'\n3. 0:15–0:22: Green velocity counter climbing from 200 to 1.5M views\n\nB-ROLL SHOTS & VISUAL DIRECTION:\n1. Cut to close-up screen recording of Instagram Insights showing 38% audience retention drop-off\n2. Quick cutaway of hands typing fast on silver MacBook with terminal metrics pulsing\n3. Split screen showing boring static reel vs. dynamic kinetic reel\n\nDELIVERY NOTES: Speak with urgent, conversational authority. Emphasize numbers ('200 views', '80 percent', 'tripled') with forward hand gestures.`
</script>

<template>
  <div class="min-h-screen bg-[#F4F1EC] text-[#141518] flex flex-col font-sans selection:bg-[#E50914] selection:text-white overflow-x-hidden pt-20">
    
    <!-- ─── A. HERO BANNER // ARCHITECTURAL CASE STUDY DECK ─── -->
    <section class="relative w-full py-20 sm:py-28 px-6 sm:px-12 bg-[#EAE6DD] border-b border-[#DCD6C8] overflow-hidden">
      <!-- Ambient background element -->
      <div class="absolute inset-0 z-0 pointer-events-none opacity-20 filter contrast-125">
        <video autoplay muted loop playsinline class="w-full h-full object-cover">
          <source src="/videos/bg-ambient-4.mp4" type="video/mp4" />
        </video>
        <div class="absolute inset-0 bg-gradient-to-b from-[#F4F1EC]/80 via-[#EAE6DD]/90 to-[#EAE6DD]"></div>
      </div>

      <div class="max-w-[88rem] mx-auto relative z-10">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          
          <div class="space-y-6 max-w-4xl">
            <span class="inline-flex items-center gap-2.5 font-display text-xs font-black uppercase tracking-[0.25em] text-[#E50914] bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-[#DED9CC] shadow-sm">
              <span class="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-ping"></span>
              <span>LIVE SIMULATION // ARCHIVIC CASE STUDY 01</span>
            </span>
            
            <h1 class="durer-heading text-5xl sm:text-7xl lg:text-8xl font-bold uppercase tracking-tight text-[#141518] leading-[0.95]">
              The 3-Agent <span class="text-[#E50914] font-display font-black tracking-normal">Teardown.</span>
            </h1>
            
            <p class="font-display text-lg sm:text-2xl text-[#444855] font-bold leading-relaxed max-w-3xl">
              Explore an authentic diagnostic execution performed by Klarix neural clusters on a creator's short-form Instagram Reel. Zero input required—experience the retention physics in action.
            </p>
          </div>

          <!-- Creator Profile Badge -->
          <div class="p-6 sm:p-7 rounded-3xl bg-[#FAFAF7] border border-[#DCD6C8] shadow-[0_15px_40px_rgba(20,21,24,0.06)] flex items-center gap-6 shrink-0 max-w-md w-full lg:w-auto">
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border-2 border-[#E50914]/40 shadow-inner">
              <img src="/assets/demo-creator.jpg" alt="Creator Avatar" class="w-full h-full object-cover filter contrast-[1.05]" />
              <div class="absolute bottom-1 right-1 bg-[#E50914] text-white p-1 rounded-md text-xs font-black shadow">IG</div>
            </div>
            <div class="space-y-1.5 min-w-0">
              <span class="text-xs font-black uppercase tracking-widest text-[#0A7B8E] block">Verified Target Subject</span>
              <h3 class="font-durer text-xl sm:text-2xl font-extrabold text-[#141518] truncate">Arjun Mehta</h3>
              <p class="text-xs sm:text-sm font-semibold text-[#6C7080]">Founder // AI Workflow SaaS</p>
              <div class="pt-1 flex items-center gap-3 text-xs font-bold text-[#141518]/90">
                <span class="bg-[#EAE6DD] px-2.5 py-0.5 rounded-md">48.2K Followers</span>
                <span class="bg-[#EAE6DD] px-2.5 py-0.5 rounded-md text-[#E50914]">Reel Audit</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ─── B. SIMULATED INPUT & TELEMETRY DECK (SLAB 01) ─── -->
    <section class="w-full py-16 sm:py-24 px-6 sm:px-12 bg-[#F4F1EC] relative z-10">
      <div class="max-w-[88rem] mx-auto">
        
        <div class="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8D3C7] pb-6">
          <div class="flex items-center gap-3">
            <span class="w-4 h-12 bg-[#141518] rounded-sm shrink-0"></span>
            <div>
              <h2 class="durer-heading text-2xl sm:text-4xl font-extrabold uppercase text-[#141518] tracking-wide">Slab 01 // Ingested Asset &amp; Telemetry Stream</h2>
              <p class="text-sm font-semibold text-[#6C7080] tracking-wide uppercase">Source Parameters Submitted for Neural Compute</p>
            </div>
          </div>
          <span class="card-ui text-xs font-extrabold px-4 py-2 bg-[#EBE7DF] border border-[#D5D0C2] rounded-xl uppercase text-[#444855]">
            🔒 ARCHIVAL METADATA LOCKED
          </span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          <!-- LEFT: VIDEO REEL PLAYER (5 Cols) -->
          <div class="lg:col-span-5 p-6 sm:p-8 rounded-[3rem] bg-[#141518] text-white shadow-[0_25px_70px_rgba(20,21,24,0.2)] border border-[#333745] flex flex-col items-center">
            <div class="w-full flex items-center justify-between mb-4 px-2">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-[#E50914] animate-pulse"></span>
                <span class="text-xs font-black uppercase tracking-widest text-white/90">INSTAGRAM REEL ASSET</span>
              </div>
              <span class="text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 px-3 py-1 rounded-lg border border-[#00E5FF]/25 uppercase tracking-wider">1080×1920 · 9:16</span>
            </div>

            <!-- Video Container -->
            <div class="relative w-full max-w-[340px] aspect-[9/16] bg-black rounded-[2.2rem] overflow-hidden border-4 border-white/10 shadow-2xl">
              <video
                autoplay
                muted
                loop
                controls
                playsinline
                class="w-full h-full object-cover filter contrast-[1.05]"
              >
                <source src="/videos/demo-reel.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <!-- Top bar watermark overlay simulation -->
              <div class="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-20">
                <span class="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase text-white/90 border border-white/15">0:16 SEC</span>
                <span class="bg-[#E50914]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-black uppercase text-white shadow-sm">AI TEST REEL</span>
              </div>
            </div>

            <div class="mt-5 text-center px-2">
              <p class="text-xs font-semibold text-white/60">Audio enabled via hover/controls. Featuring kinetic typography and workspace desk depth.</p>
            </div>
          </div>

          <!-- RIGHT: NUMERIC TELEMETRY & BRAND CONTEXT (7 Cols) -->
          <div class="lg:col-span-7 space-y-8">
            
            <!-- Telemetry Cards Grid -->
            <div class="p-8 sm:p-10 rounded-[2.5rem] bg-[#FAFAF7] border border-[#DCD6C8] shadow-[0_15px_50px_rgba(20,21,24,0.06)] space-y-8">
              <div class="flex items-center justify-between border-b border-[#E5E0D5] pb-5">
                <h3 class="font-durer text-2xl sm:text-3xl font-extrabold uppercase text-[#141518]">Performance Telemetry Stream</h3>
                <span class="text-xs font-extrabold bg-[#0A7B8E]/10 text-[#0A7B8E] px-3 py-1.5 rounded-xl border border-[#0A7B8E]/20 uppercase tracking-wider">Public + Private Metrics</span>
              </div>

              <!-- Metrics Numbers -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <div class="p-5 rounded-2xl bg-[#EBE7DF] border border-[#D5D0C2] space-y-1">
                  <span class="text-xs font-extrabold uppercase text-[#7A7E8C]">Total Views / Reach</span>
                  <div class="text-2xl sm:text-4xl font-extrabold text-[#141518]">67,400</div>
                  <span class="text-[11px] font-black text-[#0A7B8E] uppercase tracking-wide block">Tier-2 Distribution</span>
                </div>

                <div class="p-5 rounded-2xl bg-[#EBE7DF] border border-[#D5D0C2] space-y-1">
                  <span class="text-xs font-extrabold uppercase text-[#7A7E8C]">Avg. Watch Time %</span>
                  <div class="text-2xl sm:text-4xl font-extrabold text-[#E50914]">38%</div>
                  <span class="text-[11px] font-black text-[#E50914] uppercase tracking-wide block">Drop at 0:05 Sec</span>
                </div>

                <div class="p-5 rounded-2xl bg-[#EBE7DF] border border-[#D5D0C2] space-y-1">
                  <span class="text-xs font-extrabold uppercase text-[#7A7E8C]">Saves (High-Intent)</span>
                  <div class="text-2xl sm:text-4xl font-extrabold text-[#0A7B8E]">890</div>
                  <span class="text-[11px] font-black text-[#0A7B8E] uppercase tracking-wide block">Top 5% Save Rate</span>
                </div>

                <div class="p-5 rounded-2xl bg-[#EBE7DF] border border-[#D5D0C2] space-y-1">
                  <span class="text-xs font-extrabold uppercase text-[#7A7E8C]">Likes / Reactions</span>
                  <div class="text-2xl sm:text-3xl font-extrabold text-[#141518]">4,120</div>
                  <span class="text-[11px] font-bold text-[#555966]">6.1% Engagement</span>
                </div>

                <div class="p-5 rounded-2xl bg-[#EBE7DF] border border-[#D5D0C2] space-y-1">
                  <span class="text-xs font-extrabold uppercase text-[#7A7E8C]">Profile Visits Gained</span>
                  <div class="text-2xl sm:text-3xl font-extrabold text-[#141518]">1,240</div>
                  <span class="text-[11px] font-bold text-[#555966]">1.8% Conversion</span>
                </div>

                <div class="p-5 rounded-2xl bg-[#EBE7DF] border border-[#D5D0C2] space-y-1">
                  <span class="text-xs font-extrabold uppercase text-[#7A7E8C]">Target Platform</span>
                  <div class="text-xl sm:text-2xl font-extrabold text-[#141518] flex items-center gap-2 mt-1">
                    <span>📱 Instagram</span>
                  </div>
                  <span class="text-[11px] font-bold text-[#555966]">Exclusive Channel</span>
                </div>
              </div>

              <!-- Brand Context Callout -->
              <div class="p-6 rounded-3xl bg-[#141518] text-white space-y-3 border border-[#333745]">
                <div class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#00E5FF]">
                  <span>🏷️ Injected Brand &amp; Audience Context</span>
                </div>
                <p class="text-base sm:text-lg font-medium text-white/90 leading-relaxed italic">
                  "I am building a SaaS product for automated customer workflows. My target audience is early-stage founders and ops managers. We want to stop publishing boring tutorials and start creating high-retention contrarian tech content that drives organic sign-ups on Instagram."
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>

    <!-- ─── C. INTERACTIVE 3-AGENT DIAGNOSTIC TEARDOWN (SLAB 02) ─── -->
    <section class="relative w-full py-20 sm:py-32 bg-[#EAE6DD] px-6 sm:px-12 border-t border-[#DCD6C8] overflow-hidden">
      
      <!-- Ambient Background Video Element -->
      <div class="absolute inset-0 z-0 pointer-events-none opacity-20 filter contrast-125">
        <video autoplay muted loop playsinline class="w-full h-full object-cover">
          <source src="/videos/bg-ambient-4.mp4" type="video/mp4" />
        </video>
        <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#EAE6DD] via-[#EAE6DD]/60 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#EAE6DD] via-[#EAE6DD]/60 to-transparent"></div>
      </div>

      <div class="max-w-[88rem] mx-auto relative z-10">
        
        <!-- Editorial Header & Filter Tabs -->
        <div class="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#D4CFC2] pb-8">
          <div>
            <span class="inline-flex items-center gap-2 font-display text-xs font-black uppercase tracking-[0.25em] text-[#E50914] mb-3 block">
              <span>Algorithmic Prescriptions // Complete Output Engine</span>
            </span>
            <h2 class="durer-heading text-4xl sm:text-6xl font-bold text-[#141518] uppercase tracking-tight">
              Neural Diagnostic <span class="text-[#E50914] font-black font-display tracking-normal">Verdict.</span>
            </h2>
          </div>

          <!-- Interactive Node Filtering Pills -->
          <div class="flex items-center gap-2 bg-[#DED9CC] p-1.5 rounded-2xl border border-[#C8C2B4] overflow-x-auto self-start md:self-auto">
            <button @click="activeTab = 'all'" :class="activeTab === 'all' ? 'bg-[#141518] text-white font-black shadow-md' : 'text-[#444855] hover:text-black font-bold'" class="px-5 py-2.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all whitespace-nowrap">
              Full Teardown
            </button>
            <button @click="activeTab = 'visual'" :class="activeTab === 'visual' ? 'bg-[#00E5FF] text-black font-black shadow-md' : 'text-[#444855] hover:text-black font-bold'" class="px-5 py-2.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all whitespace-nowrap">
              Node 01 // Visual &amp; Speech
            </button>
            <button @click="activeTab = 'strategy'" :class="activeTab === 'strategy' ? 'bg-[#E50914] text-white font-black shadow-md' : 'text-[#444855] hover:text-black font-bold'" class="px-5 py-2.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all whitespace-nowrap">
              Node 02 // Strategist
            </button>
            <button @click="activeTab = 'script'" :class="activeTab === 'script' ? 'bg-[#E50914] text-white font-black shadow-md' : 'text-[#444855] hover:text-black font-bold'" class="px-5 py-2.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all whitespace-nowrap">
              Node 03 // Scriptwriter
            </button>
          </div>
        </div>

        <div class="space-y-12">

          <!-- CARD 1: EXTRACTED TRANSCRIPT (Node 01) -->
          <div v-if="activeTab === 'all' || activeTab === 'visual'" class="p-8 sm:p-12 rounded-3xl bg-[#141518]/95 backdrop-blur-2xl text-white border border-[#333745] shadow-[0_25px_80px_rgba(0,0,0,0.25)] space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-3 font-display text-sm sm:text-base font-bold uppercase tracking-wider text-[#00E5FF]">
                <span class="w-3 h-3 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]"></span>
                <span>EXTRACTED AUDIO SPEECH TRANSCRIPT &amp; PACING</span>
                <span class="text-xs text-white/90 px-3 py-1 rounded-lg bg-white/10 uppercase border border-white/15 font-black">Node 01</span>
              </div>
              <button @click="isTranscriptOpen = !isTranscriptOpen" type="button" class="text-xs sm:text-sm font-black uppercase tracking-wider text-white hover:text-[#00E5FF] px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 transition-all">
                {{ isTranscriptOpen ? 'Hide Transcript ▲' : 'Show Full Transcript ▼' }}
              </button>
            </div>

            <p class="text-sm font-semibold text-white/70 italic">
              "Klarix neural clusters extracted 100% of spoken words and synchronized pauses with frame analytics."
            </p>

            <div v-if="isTranscriptOpen || true" class="p-7 rounded-2xl bg-[#1A1E2E] border border-white/15 text-base sm:text-xl font-medium text-white/90 leading-relaxed whitespace-pre-wrap shadow-inner">
              <strong class="text-[#00E5FF] uppercase block text-xs font-black tracking-widest mb-2">[TIMESTAMP 0:00 - 0:16 // RESOLVED DIALOGUE]</strong>
"Here’s why ninety percent of founder Reels get ignored in the first three seconds. You're opening with who you are instead of the final transformation. When we analyzed over a hundred viral tech posts, the winners always flashed the end result at timestamp 0:01 before breaking down the system. Stop explaining—start showing."
            </div>
          </div>

          <!-- CARD 2: WHAT WORKED ✓ (Node 01) -->
          <div v-if="activeTab === 'all' || activeTab === 'visual'" class="p-8 sm:p-14 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl text-white border-t-4 border-t-[#00E5FF] border border-[#333745] shadow-[0_35px_100px_rgba(0,0,0,0.3)] space-y-8 relative overflow-hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-6 gap-4">
              <h3 class="font-durer text-3xl sm:text-4xl font-black uppercase tracking-wide text-white flex items-center gap-4">
                <span class="w-11 h-11 rounded-2xl bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/50 flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(0,229,255,0.4)]">✓</span>
                <span>Validated Mechanics</span>
              </h3>
              <button @click="copyText(copyWhatWorked, 'worked')" type="button" class="px-7 py-3.5 rounded-xl bg-white/15 hover:bg-[#00E5FF] hover:text-black border border-white/20 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md self-start sm:self-auto">
                {{ copiedId === 'worked' ? 'COPIED TO CLIPBOARD ✓' : 'COPY VALIDATIONS' }}
              </button>
            </div>

            <ul class="space-y-4 text-base sm:text-lg text-white/95 font-medium leading-relaxed">
              <li class="flex items-start gap-4 p-5 rounded-2xl bg-[#1A1E2E]/80 border border-white/10 hover:border-[#00E5FF]/50 transition-all">
                <span class="text-[#00E5FF] font-black text-2xl leading-none mt-0.5 shrink-0">•</span>
                <span><strong>Direct eye-level framing</strong> in modern daylight studio establishes immediate founder trust and professional authority.</span>
              </li>
              <li class="flex items-start gap-4 p-5 rounded-2xl bg-[#1A1E2E]/80 border border-white/10 hover:border-[#00E5FF]/50 transition-all">
                <span class="text-[#00E5FF] font-black text-2xl leading-none mt-0.5 shrink-0">•</span>
                <span><strong>Kinetic typography positioning:</strong> High-contrast white text subtitle ('DROP-OFFS WITH') positioned above lower torso level maintains visual eye engagement without obscuring facial expressions.</span>
              </li>
              <li class="flex items-start gap-4 p-5 rounded-2xl bg-[#1A1E2E]/80 border border-white/10 hover:border-[#00E5FF]/50 transition-all">
                <span class="text-[#00E5FF] font-black text-2xl leading-none mt-0.5 shrink-0">•</span>
                <span><strong>Elite Save-to-View Ratio (1.32%):</strong> Over 890 saves indicate that target founders viewed this advice as a tangible workflow reference worth archiving.</span>
              </li>
            </ul>
          </div>

          <!-- CARD 3: WHAT FAILED ✗ (Node 01) -->
          <div v-if="activeTab === 'all' || activeTab === 'visual'" class="p-8 sm:p-14 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl text-white border-t-4 border-t-[#E50914] border border-[#333745] shadow-[0_35px_100px_rgba(229,9,20,0.25)] space-y-8 relative overflow-hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-6 gap-4">
              <h3 class="font-durer text-3xl sm:text-4xl font-black uppercase tracking-wide text-white flex items-center gap-4">
                <span class="w-11 h-11 rounded-2xl bg-[#E50914]/30 text-[#E50914] border border-[#E50914]/60 flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(229,9,20,0.5)]">✗</span>
                <span>Retention Fractures</span>
              </h3>
              <button @click="copyText(copyWhatFailed, 'failed')" type="button" class="px-7 py-3.5 rounded-xl bg-white/15 hover:bg-[#E50914] border border-white/20 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md self-start sm:self-auto">
                {{ copiedId === 'failed' ? 'COPIED TO CLIPBOARD ✓' : 'COPY FRACTURES' }}
              </button>
            </div>
            
            <ul class="space-y-4 text-base sm:text-lg text-white/95 font-medium leading-relaxed">
              <li class="flex items-start gap-4 p-5 rounded-2xl bg-[#1A1E2E]/80 border border-white/10 hover:border-[#E50914]/60 transition-all">
                <span class="text-[#E50914] font-black text-2xl leading-none mt-0.5 shrink-0">•</span>
                <span><strong>Static focal pacing (Seconds 0:00–0:06):</strong> Camera angle remains locked in a medium desk shot for the initial six seconds without zooming or screen overlays, causing early viewer fatigue.</span>
              </li>
              <li class="flex items-start gap-4 p-5 rounded-2xl bg-[#1A1E2E]/80 border border-white/10 hover:border-[#E50914]/60 transition-all">
                <span class="text-[#E50914] font-black text-2xl leading-none mt-0.5 shrink-0">•</span>
                <span><strong>Missing acoustic pattern interrupt:</strong> Zero kinetic swoosh transitions or sound design accenting the pivot from the problem setup ('ninety percent') to the systemic solution.</span>
              </li>
              <li class="flex items-start gap-4 text-white bg-[#E50914]/25 p-6 rounded-2xl border border-[#E50914]/60 shadow-[0_10px_30px_rgba(229,9,20,0.3)]">
                <span class="text-[#E50914] font-black text-2xl leading-none mt-0.5 shrink-0">▼</span>
                <span><strong class="text-[#FF3A4A] uppercase font-black tracking-wider block text-xs sm:text-sm mb-1">Critical Drop-Off Threshold // Timestamp 0:05</strong> Over 54% of audience churn occurred right before second six. Viewers experienced visual monotony before the b-roll cutaway. A camera angle switch or pattern interrupt was required two seconds earlier.</span>
              </li>
            </ul>

            <div class="pt-6 border-t border-white/15 text-base sm:text-lg font-medium text-white leading-relaxed bg-[#1A1E2E] p-7 rounded-3xl border border-white/15 shadow-inner">
              <span class="font-bold uppercase text-xs sm:text-sm tracking-widest block mb-3 text-[#E50914] flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[#E50914]"></span>
                <span>AI Neural Diagnostic Verdict:</span>
              </span>
              This Reel proves exceptional content resonance (proven by 890 saves), but suffers from structural editing inertia in the opening 5 seconds. Implementing rapid visual transitions and split-screen proof will instantly elevate this post from 67k views into 500k+ algorithmic distribution.
            </div>
          </div>

          <!-- CARD 4: STRATEGIC ROADMAP → (Node 02) -->
          <div v-if="activeTab === 'all' || activeTab === 'strategy'" class="p-8 sm:p-14 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl text-white border border-[#333745] shadow-[0_35px_100px_rgba(0,0,0,0.3)] space-y-8 relative overflow-hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-6 gap-4">
              <h3 class="font-durer text-3xl sm:text-4xl font-black uppercase tracking-wide text-white flex items-center gap-4">
                <span class="text-[#E50914] text-4xl leading-none">→</span>
                <span>Strategic Roadmap // Node 02</span>
              </h3>
              <button @click="copyText(copyStrategy, 'strategy')" type="button" class="px-7 py-3.5 rounded-xl bg-white/15 hover:bg-[#E50914] border border-white/20 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md self-start sm:self-auto">
                {{ copiedId === 'strategy' ? 'COPIED ROADMAP ✓' : 'COPY ROADMAP' }}
              </button>
            </div>

            <div class="space-y-5 text-base sm:text-lg text-white font-medium divide-y divide-white/10">
              <div class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-[#E50914] sm:w-1/3 shrink-0">Priority Fix</span>
                <span class="text-white text-base sm:text-lg sm:w-2/3">Implement an instant camera angle shift from medium desk shot to compressed close-up at timestamp 0:03, paired with subtle kinetic zooming on emphasis words.</span>
              </div>
              <div class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-white/75 sm:w-1/3 shrink-0">Format &amp; Angle</span>
                <span class="text-white text-base sm:text-lg sm:w-2/3 bg-white/10 px-5 py-2.5 rounded-xl border border-white/15 inline-block">Short-Form Reel &middot; Contrarian Data Teardown</span>
              </div>
              <div class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-white/75 sm:w-1/3 shrink-0">Hook Direction</span>
                <span class="text-white text-base sm:text-lg sm:w-2/3">Lead directly with a split-screen screen recording showing an authentic declining analytics graph before transitioning to your face.</span>
              </div>
              <div class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-[#00E5FF] sm:w-1/3 shrink-0">Trend Intelligence</span>
                <span class="text-white text-base sm:text-lg sm:w-2/3">Tech founders in Q3 respond 3x faster to visual proof (code terminal screens or CRM dashboards) within the first 1.5 seconds than verbal promises.</span>
              </div>
              <div class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-white/75 sm:w-1/3 shrink-0">Competitor Gap</span>
                <span class="text-white text-base sm:text-lg sm:w-2/3">Most AI automation creators talk in abstract theory. Displaying actual live terminal execution or visual telemetry graphs builds unbeatable differentiation.</span>
              </div>
              <div class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-white/75 sm:w-1/3 shrink-0">Publishing Window</span>
                <span class="text-white text-base sm:text-lg sm:w-2/3 font-extrabold text-[#00E5FF]">Tuesdays and Thursdays · 08:30 – 10:30 AM EST (Optimized for founder work routines)</span>
              </div>
              <div class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-[#E50914] sm:w-1/3 shrink-0">Expected Velocity</span>
                <span class="text-white text-2xl sm:text-4xl font-extrabold sm:w-2/3">3.4x Reach (+180,000 Views)</span>
              </div>
              <div class="pt-6">
                <span class="block text-xs sm:text-sm uppercase font-black tracking-widest text-white/80 mb-3">Strategic Reasoning Architecture:</span>
                <p class="text-base sm:text-lg text-white/90 leading-relaxed bg-[#1A1E2E] p-7 rounded-3xl border border-white/15 shadow-inner">
                  "Your content carries top-tier educational utility, proved by your save volume. However, because early visual friction caused 54% of casual viewers to swipe away before the lesson delivered, Instagram's algorithm halted recommendation loops. Enhancing visual pattern frequency in the first 4 seconds will unlock Explore-page expansion."
                </p>
              </div>
            </div>
          </div>

          <!-- CARD 5: PRODUCTION TELEPROMPTER SCRIPT DECK (Node 03) -->
          <div v-if="activeTab === 'all' || activeTab === 'script'" class="p-8 sm:p-14 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl text-white border-2 border-[#E50914]/60 shadow-[0_45px_120px_rgba(229,9,20,0.3)] space-y-10 relative overflow-hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-6 gap-4 relative z-10">
              <h3 class="font-durer text-3xl sm:text-4xl font-black uppercase tracking-wide text-white flex items-center gap-4">
                <span class="w-4 h-4 rounded-full bg-[#E50914] animate-pulse"></span>
                <span>Production Teleprompter // Node 03</span>
              </h3>
              <button @click="copyText(copyScript, 'script')" type="button" class="px-8 py-4 rounded-xl bg-[#E50914] hover:bg-white hover:text-[#111111] text-white shadow-[0_15px_35px_rgba(229,9,20,0.5)] border border-white/20 font-black text-xs sm:text-sm uppercase tracking-wider transition-all hover:scale-105 self-start sm:self-auto">
                {{ copiedId === 'script' ? 'SCRIPT COPIED TO CLIPBOARD ✓' : 'COPY FULL SCRIPT DECK' }}
              </button>
            </div>

            <!-- Script Sections -->
            <div class="space-y-6 relative z-10">
              <div class="p-6 sm:p-8 rounded-3xl bg-[#E50914]/20 border border-[#E50914]/60 shadow-[0_15px_40px_rgba(229,9,20,0.3)]">
                <div class="text-xs sm:text-sm font-black text-[#E50914] uppercase tracking-widest mb-3 flex items-center gap-2.5">
                  <span class="w-3 h-3 rounded-full bg-[#E50914] shadow-[0_0_10px_#E50914]"></span>
                  <span>HOOK &middot; 0:00–0:03 // CRITICAL RETENTION WINDOW</span>
                </div>
                <div class="text-xl sm:text-3xl font-bold text-white leading-relaxed">
                  "Stop filming 8-hour talking head videos that plateau at 200 views."
                </div>
              </div>

              <div class="p-6 sm:p-8 rounded-3xl bg-[#141728] border border-white/15 shadow-inner">
                <div class="text-xs sm:text-sm font-black text-white/80 uppercase tracking-widest mb-3">BODY &middot; 0:03–0:22 // NARRATIVE ENGAGEMENT</div>
                <div class="text-base sm:text-xl font-medium text-white/95 leading-relaxed">
                  "The problem isn't your hook—it's your structural editing after second five. Look at this retention heatmap: when you talk without switching camera focal points every four seconds, eighty percent of users scroll. Once we added kinetic text animations and split-screen telemetry to our videos, reach tripled in under two weeks."
                </div>
              </div>

              <div class="p-6 sm:p-8 rounded-3xl bg-[#141728] border border-white/25 shadow-md">
                <div class="text-xs sm:text-sm font-black text-[#00E5FF] uppercase tracking-widest mb-3 flex items-center gap-2.5">
                  <span class="w-3 h-3 rounded-full bg-[#00E5FF]"></span>
                  <span>CALL TO ACTION &middot; 0:22–0:28 // CONVERSION ENGINE</span>
                </div>
                <div class="text-lg sm:text-2xl font-bold text-white leading-relaxed">
                  "Comment 'TELEMETRY' below and I'll dm you our open-source 3-agent video analysis engine."
                </div>
              </div>

              <div class="p-6 sm:p-8 rounded-3xl bg-[#0E111E] border border-white/15">
                <div class="text-xs sm:text-sm font-black text-white/85 uppercase tracking-wider mb-4 flex items-center gap-2.5">
                  <span class="w-2 h-2 rounded-full bg-white/60"></span>
                  <span>DYNAMIC TEXT OVERLAYS // SCREEN LAYER</span>
                </div>
                <ol class="list-decimal list-inside text-base sm:text-lg text-white/95 space-y-3 font-medium">
                  <li><strong>0:00–0:03:</strong> Large bold crimson banner banner: <span class="text-[#E50914] font-black">'WHY REELS DIE AT 200 VIEWS'</span></li>
                  <li><strong>0:05–0:10:</strong> Highlight box over retention drop graph: <span class="text-[#00E5FF] font-bold">'80% SCROLL HERE'</span></li>
                  <li><strong>0:15–0:22:</strong> Green velocity counter climbing from 200 to 1.5M views</li>
                </ol>
              </div>

              <div class="p-6 sm:p-8 rounded-3xl bg-[#0E111E] border border-white/15">
                <div class="text-xs sm:text-sm font-black text-white/85 uppercase tracking-wider mb-4 flex items-center gap-2.5">
                  <span class="w-2 h-2 rounded-full bg-white/60"></span>
                  <span>B-ROLL SHOTS &amp; VISUAL DIRECTION // CUTAWAYS</span>
                </div>
                <ol class="list-decimal list-inside text-base sm:text-lg text-white/95 space-y-3 font-medium">
                  <li>Cut to close-up screen recording of Instagram Insights showing 38% audience retention drop-off at second five.</li>
                  <li>Quick cutaway of hands typing fast on silver MacBook with terminal metrics pulsing on screen.</li>
                  <li>Split screen showing static un-optimized reel vs. dynamic kinetic reel with view growth counters.</li>
                </ol>
              </div>

              <div class="p-6 rounded-2xl bg-white/5 border border-white/15 text-sm sm:text-base font-medium text-white/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span><strong class="text-[#00E5FF] font-extrabold uppercase tracking-wider">Delivery Notes:</strong> Speak with urgent, conversational authority. Emphasize numbers ('200 views', '80 percent', 'tripled') with forward hand gestures.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ─── D. HIGH-CONVERTING CONVERSION BOTTOM BANNER ─── -->
    <section class="w-full py-20 sm:py-28 bg-[#141518] text-white relative z-10 px-6 sm:px-12 border-t border-[#333745]">
      <div class="max-w-[70rem] mx-auto text-center space-y-8">
        <span class="text-xs font-extrabold uppercase tracking-[0.25em] text-[#00E5FF] bg-white/5 px-5 py-2 rounded-full border border-white/10">
          Ready to transition from simulation to execution?
        </span>
        <h2 class="durer-heading text-4xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-white leading-none">
          Audit Your Own <span class="text-[#E50914] font-black">Reels Free.</span>
        </h2>
        <p class="text-lg sm:text-xl font-medium text-white/80 max-w-2xl mx-auto leading-relaxed">
          Don't guess why your content is stagnating. Paste your Instagram Reel link into our neural analysis engine and get your personalized 3-Node prescription in under 15 seconds.
        </p>
        
        <div class="pt-6">
          <router-link
            to="/analyse"
            class="inline-flex items-center justify-center gap-4 px-12 py-6 rounded-2xl bg-[#E50914] hover:bg-white hover:text-[#141518] text-white font-black text-xl sm:text-2xl uppercase tracking-[0.12em] transition-all duration-300 shadow-[0_20px_50px_rgba(229,9,20,0.4)] hover:shadow-[0_25px_60px_rgba(255,255,255,0.25)] hover:scale-105"
          >
            <span>Run Free Diagnosis on Your Reels</span>
            <span class="font-black text-3xl">→</span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ─── E. ARCHITECTURAL FOOTER SECTION ─── -->
    <FooterSection />

  </div>
</template>

<style scoped>
/* Scoped Durer / Daylight styling enhancements */
.durer-heading {
  font-family: 'IF Durer', 'Outfit', sans-serif;
  letter-spacing: -0.01em;
}
</style>
