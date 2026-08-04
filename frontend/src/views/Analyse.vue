<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

// Strict UI States exactly as specified
const STATES = {
  IDLE:     'idle',      // Empty. No output shown. Initial state.
  LOADING:  'loading',   // Agents are running. Show progress only.
  PARTIAL:  'partial',   // Some agents done. Show completed cards only.
  COMPLETE: 'complete',  // All agents done. Show all 4 cards.
  ERROR:    'error',     // Something failed. Show error message only.
}

const currentState = ref(STATES.IDLE)
const isLoaded = ref(false)
const loadingStepText = ref('')
const activeAgentStep = ref(0)
const errorMessage = ref('')
const copiedId = ref(null)
const isTranscriptOpen = ref(false)

let lenis = null
let tickerCallback = null

// Input Form Reactive State
const contentType = ref('Reel') // 'Reel' | 'Carousel' | 'Static Post'
const platform = ref('Instagram') // 'Instagram' | 'LinkedIn'
const isDragging = ref(false)
const uploadedFiles = ref([]) // Array of { file, url, name, size, type, category: 'video' | 'image' }
const fileInput = ref(null)

const form = reactive({
  views: '',
  watchTime: '',
  likes: '',
  comments: '',
  shares: '',
  saves: '',
  profileVisits: '',
  followersGained: '',
  brandContext: ''
})

// URL Ingestion State
const instagramUrl = ref('')
const isUrlConnected = ref(false)

// Real AI Agent Output Stores
const diagnosis = ref(null)
const strategy = ref(null)
const script = ref(null)

// File Drop & Multi-Slide Selection Mechanics
const onDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const onDragLeave = () => {
  isDragging.value = false
}

const onDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  if (isUrlConnected.value) return
  const files = e.dataTransfer.files
  if (files && files.length > 0) handleFiles(files)
}

const onFileChange = (e) => {
  const files = e.target.files
  if (files && files.length > 0) handleFiles(files)
}

const handleFiles = (fileList) => {
  for (const file of fileList) {
    if (file.size > 50 * 1024 * 1024) {
      errorMessage.value = `File "${file.name}" is too large (${(file.size/(1024*1024)).toFixed(1)}MB). Please compress videos/images to under 50MB.`
      currentState.value = STATES.ERROR
      return
    }

    const url = URL.createObjectURL(file)
    const category = file.type.startsWith('video/') ? 'video' : 'image'
    uploadedFiles.value.push({ file, url, name: file.name, size: file.size, type: file.type, category })
  }

  if (uploadedFiles.value.length > 1) {
    contentType.value = 'Carousel'
  } else if (uploadedFiles.value.length === 1) {
    contentType.value = uploadedFiles.value[0].category === 'video' ? 'Reel' : 'Static Post'
  }
}

const triggerFileInput = () => {
  if (isUrlConnected.value) return
  fileInput.value?.click()
}

const removeFile = (idx, e) => {
  if (e) e.stopPropagation()
  const removed = uploadedFiles.value.splice(idx, 1)[0]
  if (removed?.url) URL.revokeObjectURL(removed.url)

  if (uploadedFiles.value.length === 0) {
    contentType.value = 'Reel'
  } else if (uploadedFiles.value.length === 1) {
    contentType.value = uploadedFiles.value[0].category === 'video' ? 'Reel' : 'Static Post'
  }
}

const clearAllFiles = (e) => {
  if (e) e.stopPropagation()
  uploadedFiles.value.forEach(item => URL.revokeObjectURL(item.url))
  uploadedFiles.value = []
  contentType.value = 'Reel'
}

// Clipboard Helper
const copyText = (text, id) => {
  navigator.clipboard.writeText(text)
  copiedId.value = id
  setTimeout(() => {
    if (copiedId.value === id) copiedId.value = null
  }, 2500)
}

// Smooth Scroll Navigation Helper
const scrollToSection = (id) => {
  const element = document.getElementById(id)
  if (element) {
    if (lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(element, { duration: 1.4, offset: 0 })
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

// FORMATTERS FOR COPYING REAL AI RESPONSES
const copyWhatWorked = computed(() => {
  if (!diagnosis.value?.what_worked) return ''
  return diagnosis.value.what_worked.map(w => `• ${w}`).join('\n')
})

const copyWhatFailed = computed(() => {
  if (!diagnosis.value?.what_failed) return ''
  const items = diagnosis.value.what_failed.map(f => `• ${f}`).join('\n')
  return `${items}\n\nOverall Diagnosis:\n${diagnosis.value.overall_diagnosis || ''}`
})

const copyStrategy = computed(() => {
  if (!strategy.value) return ''
  const s = strategy.value
  return [
    `Priority fix: ${s.priority_fix || ''}`,
    `Content type: ${s.next_content_type || ''}`,
    `Angle: ${s.next_content_angle || ''}`,
    `Hook direction: ${s.hook_direction || ''}`,
    `Trend insight: ${s.trend_insight || ''}`,
    `Best time to post: ${s.best_time_to_post || ''}`,
    `Expected impact: ${s.estimated_impact || ''}`,
    `Strategic reasoning: ${s.strategic_reasoning || ''}`
  ].join('\n')
})

const copyScript = computed(() => {
  if (!script.value) return ''
  const sc = script.value
  return [
    `HOOK (0:00–0:03)\n${sc.hook || ''}`,
    `\nBODY (0:03–0:25)\n${sc.body || ''}`,
    `\nCTA (0:25–0:32)\n${sc.cta || ''}`,
    `\nTEXT OVERLAYS:\n${(sc.text_overlays || []).join('\n')}`,
    `\nB-ROLL SHOTS:\n${(sc.b_roll_suggestions || []).join('\n')}`,
    `\nDELIVERY NOTES:\n${sc.delivery_notes || ''}`,
    `\nESTIMATED LENGTH: ${sc.estimated_length || ''}`
  ].join('\n')
})

// MAIN AI ORCHESTRATION VIA BACKEND API REQUEST
const runAnalysis = async () => {
  if (uploadedFiles.value.length === 0 && !isUrlConnected.value && (!form.views || String(form.views).trim() === '')) {
    errorMessage.value = "Missing Content or Data: Please attach your carousel slides, reel, image post, connect a media URL, or provide your performance metrics before running an analysis."
    currentState.value = STATES.ERROR
    return
  }

  errorMessage.value = ''
  diagnosis.value = null
  strategy.value = null
  script.value = null
  
  currentState.value = STATES.LOADING
  activeAgentStep.value = 1
  loadingStepText.value = "Transmitting telemetry to secure Klarix server..."

  try {
    const formData = new FormData()
    if (uploadedFiles.value.length > 0) {
      formData.append('mediaFile', uploadedFiles.value[0].file)
    }
    if (isUrlConnected.value && instagramUrl.value.trim() !== '') {
      formData.append('url', instagramUrl.value.trim())
    }
    formData.append('contentType', contentType.value)
    formData.append('platform', platform.value)
    formData.append('views', form.views || '')
    formData.append('watchTime', form.watchTime || '')
    formData.append('likes', form.likes || '')
    formData.append('comments', form.comments || '')
    formData.append('shares', form.shares || '')
    formData.append('saves', form.saves || '')
    formData.append('profileVisits', form.profileVisits || '')
    formData.append('followersGained', form.followersGained || '')
    formData.append('brandContext', form.brandContext || '')

    const uxTimer = setInterval(() => {
      if (activeAgentStep.value < 3) {
        activeAgentStep.value++
        loadingStepText.value = activeAgentStep.value === 2 
          ? "Node 02: Correlating Retention Curves & Competitor Gaps..." 
          : "Node 03: Synthesizing High-Velocity Viral Script..."
      }
    }, 7000)

    const response = await fetch('http://localhost:3001/api/analyse', {
      method: 'POST',
      body: formData
    })

    clearInterval(uxTimer)

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || `Backend server error: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      diagnosis.value = data.raw.diagnosis
      strategy.value = data.raw.strategy
      script.value = data.raw.scriptOutput
      
      activeAgentStep.value = 3
      currentState.value = STATES.COMPLETE
    } else {
      throw new Error("Pipeline execution failed on backend.")
    }

  } catch (error) {
    console.error("[Klarix UI Error]", error)
    currentState.value = STATES.ERROR
    errorMessage.value = `Analysis failed: ${error.message || 'Unknown network error occurred.'}`
  }
}

// ─── INSTAGRAM URL INGESTION HANDLERS ───
const connectUrl = () => {
  if (uploadedFiles.value.length > 0) {
    alert("Please remove the uploaded media files below before connecting a URL asset.")
    return
  }
  if (!instagramUrl.value || !instagramUrl.value.trim()) {
    alert("Please paste a valid Instagram Reel or Post URL first.")
    return
  }
  isUrlConnected.value = true
}

const clearUrl = () => {
  instagramUrl.value = ''
  isUrlConnected.value = false
}

onMounted(async () => {
  window.scrollTo(0, 0)
  await nextTick()
  setTimeout(() => {
    isLoaded.value = true
  }, 100)

  // 1. Lenis Smooth Scroll Initialization
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

  // Immediately force virtual scroll & viewport to very top (0px) on load
  if (lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(0, { immediate: true })
  }
  window.scrollTo(0, 0)
})

onUnmounted(() => {
  if (lenis) lenis.destroy()
  if (tickerCallback) gsap.ticker.remove(tickerCallback)
  ScrollTrigger.getAll().forEach(trigger => trigger.kill())
})
</script>

<template>
  <!-- Executive 2026 Warm Beige-White Daylight Studio (Synced with Landing Page Light Theme & Premium Agency Aesthetics) -->
  <div class="relative w-full min-h-screen bg-[#F4F1EC] text-[#141518] font-display overflow-x-hidden selection:bg-[#E50914] selection:text-white">

    <!-- ─── ARCHITECTURAL DAYLIGHT GLASS NAVIGATION SLAB ─── -->
    <div class="fixed top-0 left-0 w-full z-50 pointer-events-none pt-4 sm:pt-6 px-4 sm:px-12 transition-all duration-300">
      <header class="max-w-[92rem] mx-auto pointer-events-auto bg-[#FAFAF7]/85 backdrop-blur-2xl rounded-2xl transition-all duration-500 hover:bg-[#FFFFFF]/95 border border-[#E5E0D6] shadow-[0_15px_45px_rgba(20,21,24,0.06)]">
        <div class="px-6 sm:px-10 h-20 flex items-center justify-between">
          
          <!-- Brand Logo Reference styled with clean Radio Grotesk tracking -->
          <RouterLink to="/" class="interactive-hover flex items-center gap-4 group">
            <img
              src="/brand_logo.jpeg"
              alt="Klarix Logo"
              class="h-11 w-auto object-contain transition-transform duration-500 group-hover:scale-105 rounded-lg border border-[#E5E0D6]/60 shadow-sm"
            />
            <span class="font-display font-black tracking-[-0.04em] text-2xl sm:text-3xl text-[#141518] uppercase">
              Klarix
            </span>
          </RouterLink>

          <!-- Executive Studio Indicators & Navigation -->
          <div class="flex items-center gap-4 sm:gap-8">
            <RouterLink 
              to="/" 
              class="interactive-hover font-display text-xs font-black uppercase tracking-[0.2em] text-[#555862] hover:text-[#E50914] transition-colors flex items-center gap-2"
            >
              <span>← Return Home</span>
            </RouterLink>
          </div>

        </div>
      </header>
    </div>

    <!-- ─── A. HERO STUDIO ARCHITECTURE (FULL-SCREEN CINEMA BANNER WITH SEAMLESS SECTION BLENDING) ─── -->
    <section class="relative w-full min-h-[92vh] pt-36 sm:pt-44 pb-28 px-6 sm:px-12 flex items-center justify-start overflow-hidden">
      
      <!-- 1. FULL-SCREEN AMBIENT BANNER VIDEO (ROTATING GLOBE CANVAS) -->
      <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          autoplay
          muted
          loop
          playsinline
          class="w-full h-full object-cover object-center filter contrast-[1.08] saturate-[1.15] scale-105 transition-transform duration-1000"
        >
          <source src="/videos/hero-globe.mp4" type="video/mp4" />
        </video>
        <!-- Editorial Daylight Overlay Veil for High-Contrast Text Legibility -->
        <div class="absolute inset-0 bg-gradient-to-r from-[#FAFAF6] via-[#FAFAF6]/75 to-transparent/30"></div>
        <!-- Top transition blending from navigation header -->
        <div class="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#FAFAF6] via-[#FAFAF6]/80 to-transparent"></div>
        <!-- Seamless Kinetic Blending Gradient dissolving directly into Section B -->
        <div class="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-b from-transparent via-[#F4F1EC]/85 to-[#F4F1EC] z-10"></div>
      </div>
      
      <!-- Subtle Structural Engineering Background Grid over veil -->
      <div class="absolute inset-0 z-0 pointer-events-none opacity-25 bg-grid-pattern"></div>
      
      <!-- Architectural Soft Golden Ambient Warm Light Blobs -->
      <div class="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(229,9,20,0.08)_0%,transparent_70%)] pointer-events-none blur-3xl z-0"></div>
      <div class="absolute top-1/3 right-10 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(0,163,196,0.09)_0%,transparent_70%)] pointer-events-none blur-3xl z-0"></div>

      <div class="max-w-[92rem] mx-auto w-full relative z-10 flex flex-col justify-center">
        
        <!-- Monumental Proportional Typography in Warm Charcoal over Cinema Banner -->
        <div class="max-w-4xl space-y-8 text-left z-10">

          <h1 class="durer-heading text-[11vw] sm:text-[6.5rem] lg:text-[7.5rem] text-[#141518] uppercase select-none tracking-[0.01em] leading-[0.88]">
            Performance <br />
            <span class="flex items-baseline gap-4 flex-wrap mt-2">
              <span>Diagnostic</span>
            </span>
          </h1>

          <div class="flex items-baseline gap-4 pt-1">
            <span class="font-display text-[7vw] sm:text-[4.5rem] lg:text-[5.8rem] font-black tracking-[-0.03em] text-[#E50914] normal-case drop-shadow-[0_4px_15px_rgba(229,9,20,0.25)]">
              Studio.
            </span>
          </div>

          <p class="font-display text-lg sm:text-2xl text-[#3E424D] font-semibold leading-relaxed tracking-[-0.01em] max-w-2xl pt-2">
            We discarded conversational guesswork for empirical precision. Ingest your media assets and analytics into our 3-node daylight architecture to diagnose retention fractures and engineer algorithmic dominance.
          </p>

          <div class="pt-6 flex flex-wrap items-center gap-6 font-display">
            <a 
              href="#ingestion-console" 
              @click.prevent="scrollToSection('ingestion-console')"
              class="px-9 py-5 rounded-2xl bg-[#E50914] hover:bg-[#141518] text-white font-black text-xs sm:text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_15px_35px_rgba(229,9,20,0.35)] hover:shadow-[0_18px_45px_rgba(20,21,24,0.25)] hover:translate-y-[-2px] flex items-center gap-3"
            >
              <span>Initialize Ingestion Deck</span>
              <span class="text-lg animate-bounce">↓</span>
            </a>
          </div>
        </div>

      </div>
    </section>

    <!-- ─── B. THE COMMAND CONSOLE (DYNAMIC TEXTURED DAYLIGHT INGESTION STUDIO WITH KINETIC ROLLING VIDEO) ─── -->
    <section id="ingestion-console" class="relative w-full py-28 sm:py-36 bg-[#F4F1EC] px-6 sm:px-12 overflow-hidden border-b border-[#E3DDD1]">
      
      <!-- ─── RICH BACKGROUND ARCHITECTURAL TEXTURING & SEAMLESS VIDEO BLENDING ─── -->
      <!-- 1. Ambient Rolling Sphere Video blending from Hero banner into Console -->
      <div class="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-90">
        <video
          autoplay
          muted
          loop
          playsinline
          class="w-full h-full object-cover filter contrast-[1.08] brightness-[1.02]"
        >
          <source src="/videos/section-b-rolling.mp4" type="video/mp4" />
        </video>
        <!-- Top blending gradient completing the smooth transition from Hero Banner -->
        <div class="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-[#F4F1EC] via-[#F4F1EC]/80 to-transparent"></div>
        <!-- Bottom structural integration gradient -->
        <div class="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#EAE6DD] via-[#EAE6DD]/80 to-transparent"></div>
      </div>

      <!-- 2. Permanent Structural Micro-Grid over entire section -->
      <div class="absolute inset-0 z-0 pointer-events-none bg-grid-pattern opacity-40"></div>
      
      <!-- 3. Colossal Faded Watermark Typography behind cards (Kept exactly as requested) -->
      <div class="absolute top-12 left-1/2 -translate-x-1/2 z-0 pointer-events-none select-none overflow-hidden w-full text-center">
        <span class="font-durer text-[14vw] font-black uppercase tracking-widest text-[#141518]/15 block leading-none">
          INGESTION
          PAYLOAD
        </span>
      </div>
      <div class="absolute bottom-20 left-4 sm:left-12 z-0 pointer-events-none select-none opacity-30">
        <span class="font-durer text-[10vw] font-black uppercase tracking-tighter text-[#141518] block leading-none">
          TELEMETRY
        </span>
      </div>

      <!-- 4. Dynamic Architectural Side Index & Vertical Ruling Line -->
      <div class="absolute left-6 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-[#141518]/20 to-transparent hidden xl:block z-10"></div>
      <div class="absolute left-8 top-1/3 hidden xl:flex flex-col items-center gap-6 text-[#141518]/60 font-display z-10 select-none">
      </div>

      <!-- 5. Soft Ambient Warm Highlights -->
      <div class="absolute top-1/2 left-1/4 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(252,250,246,0.6)_0%,transparent_60%)] pointer-events-none blur-3xl z-0"></div>
      <div class="absolute bottom-1/4 right-10 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(229,9,20,0.05)_0%,transparent_70%)] pointer-events-none blur-3xl z-0"></div>

      <div class="max-w-[92rem] mx-auto relative z-10">
        
        <!-- Section Title Slate -->
        <div class="mb-16 sm:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#D8D2C4] pb-10">
          <div>
            <span class="font-display text-xs font-black tracking-[0.25em] uppercase text-[#E50914] block mb-3">
              [ NODE CONSOLE // EMPIRICAL UPLOAD ]
            </span>
            <h2 class="font-durer text-5xl sm:text-7xl font-black tracking-[0.01em] text-[#141518] uppercase leading-[0.9]">
              Data <span class="text-[#E50914]">Ingestion.</span>
            </h2>
          </div>
          <p class="font-display text-lg sm:text-2xl text-[#4A4E5A] font-semibold max-w-xl leading-relaxed tracking-[-0.01em]">
            Upload media artifacts and numeric telemetry into our bright agency console. Powered by real-time spatial analytics and empirical scoring engines.
          </p>
        </div>

        <div class="max-w-5xl mx-auto space-y-16">
          
          <!-- ─── SLAB 01: MEDIA INGESTION NODE (DAYLIGHT LIQUID IVORY GLASS WITH ARIAL UI TYPOGRAPHY) ─── -->
          <div 
            class="interactive-hover w-full rounded-[2.5rem] bg-[#FAFAF6]/95 backdrop-blur-xl text-[#141518] p-8 sm:p-14 lg:p-20 transition-all duration-500 overflow-hidden shadow-[0_30px_80px_rgba(20,21,24,0.08)] hover:shadow-[0_35px_100px_rgba(20,21,24,0.12)] border border-[#E3E0D6] relative group/slate card-ui"
          >
            <!-- Top Specular White Hairline -->
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#E50914]/80 to-transparent opacity-80"></div>

            <!-- Subtle Interior Corner Ornamentation -->
            <div class="absolute top-6 right-6 font-mono text-[11px] font-bold text-[#9DA1AE] border border-[#DBD6CA] px-3 py-1 rounded-md hidden sm:block uppercase tracking-widest">
              NODE_ID: M-IN_2026
            </div>

            <div class="relative z-10 space-y-8">
              <!-- Node Header Motif -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3DEDB] pb-6">
                <div class="flex items-center gap-4">
                  <span class="text-5xl sm:text-6xl font-durer font-extrabold text-[#E50914] tracking-normal select-none">01</span>
                  <span class="h-8 w-[2px] bg-[#DBD5C8]"></span>
                  <span class="card-ui text-sm sm:text-base font-extrabold tracking-[0.08em] uppercase text-[#141518]">Ingestion Node // Media Artifacts</span>
                </div>
                <span v-if="uploadedFiles.length > 1" class="text-xs sm:text-sm card-ui font-extrabold uppercase tracking-wide bg-[#E50914]/15 text-[#E50914] px-4 py-2 rounded-xl border border-[#E50914]/30 shadow-sm animate-pulse">
                  Carousel Deck Active ({{ uploadedFiles.length }} Slides)
                </span>
              </div>

              <!-- ─── FAST URL INGESTION BAR (INSTANT LINK CONNECTION) ─── -->
              <div class="p-6 sm:p-8 rounded-3xl bg-[#F3EFEB] border border-[#D5D0C2] shadow-inner space-y-4">
                <div class="flex items-center justify-between">
                  <label class="block card-ui text-sm sm:text-base font-bold text-[#141518] uppercase tracking-wider">
                    Paste Instagram Reel or Post URL
                  </label>
                  <span v-if="uploadedFiles.length === 0" class="text-xs card-ui font-extrabold text-[#E50914] bg-[#E50914]/10 px-3 py-1 rounded-lg border border-[#E50914]/20 uppercase">
                    Recommended for speed
                  </span>
                  <span v-else class="text-xs card-ui font-extrabold text-[#7A7F8E] bg-[#EBE7DF] px-3 py-1 rounded-lg border border-[#D5D0C2] uppercase">
                    Disabled
                  </span>
                </div>

                <!-- State 1: Disabled because File is uploaded -->
                <div v-if="uploadedFiles.length > 0" class="p-5 sm:p-6 rounded-2xl bg-[#EBE7DF]/80 border border-[#D5D0C2] flex items-center justify-between gap-4 card-ui opacity-90">
                  <div class="flex items-center gap-4 min-w-0 text-left">
                    <div class="w-12 h-12 rounded-xl bg-[#DFD9CE] text-[#7A7F8E] flex items-center justify-center text-xl shrink-0">🔒</div>
                    <div class="min-w-0">
                      <div class="text-sm font-extrabold text-[#7A7F8E] uppercase tracking-wider">URL Ingestion Disabled</div>
                      <div class="text-xs sm:text-sm font-semibold text-[#5C606E] truncate">A local media file is actively attached below. Remove the uploaded asset to enable URL ingestion.</div>
                    </div>
                  </div>
                  <span class="text-xs font-extrabold bg-[#DFD9CE] text-[#5C606E] px-4 py-2 rounded-xl uppercase tracking-wider shrink-0 hidden sm:block">Locked</span>
                </div>

                <!-- State 2: Active & Not Connected -->
                <div v-else-if="!isUrlConnected" class="flex flex-col sm:flex-row items-stretch gap-4">
                  <input
                    v-model="instagramUrl"
                    type="url"
                    placeholder="https://www.instagram.com/reels/C8x... or /p/..."
                    class="flex-1 bg-white text-[#141518] card-ui text-base sm:text-lg font-bold px-6 py-4 rounded-2xl border border-[#D5D0C2] focus:border-[#E50914] focus:outline-none transition-all shadow-sm placeholder-[#8A8F9E]"
                    @keydown.enter.prevent="connectUrl"
                  />
                  <button
                    @click="connectUrl"
                    type="button"
                    class="px-8 py-4 rounded-2xl bg-[#E50914] hover:bg-[#141518] text-white card-ui text-sm sm:text-base font-extrabold uppercase tracking-wider transition-all duration-300 shadow-[0_15px_35px_rgba(229,9,20,0.3)] hover:shadow-[0_15px_35px_rgba(20,21,24,0.3)] shrink-0 flex items-center justify-center gap-3"
                  >
                    <span>Connect URL Asset</span>
                    <span>→</span>
                  </button>
                </div>

                <!-- State 3: URL Connected & Locked -->
                <div v-else class="p-5 rounded-2xl bg-white border border-[#E50914]/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 card-ui">
                  <div class="flex items-center gap-4 min-w-0">
                    <div class="w-12 h-12 rounded-xl bg-[#E50914]/10 flex items-center justify-center text-xl shrink-0">🎬</div>
                    <div class="min-w-0 text-left">
                      <div class="text-sm font-bold text-[#E50914] uppercase tracking-wider">URL Asset Locked for Diagnosis</div>
                      <div class="text-base font-extrabold text-[#141518] truncate max-w-md sm:max-w-lg">{{ instagramUrl }}</div>
                    </div>
                  </div>
                  <button @click="clearUrl" type="button" title="Clear connected URL and re-enable file uploads" class="px-7 py-3.5 rounded-xl bg-[#141518] hover:bg-[#E50914] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-colors shrink-0 shadow-md">
                    Clear URL
                  </button>
                </div>
              </div>

              <!-- Divider Motif -->
              <div class="flex items-center gap-4 py-2">
                <div class="flex-1 h-px bg-[#D5D0C2]"></div>
                <span class="card-ui text-xs font-bold text-[#7A7F8E] uppercase tracking-widest">or upload media file directly below</span>
                <div class="flex-1 h-px bg-[#D5D0C2]"></div>
              </div>

              <!-- State 1: Disabled Dropzone because URL is connected -->
              <div v-if="isUrlConnected" class="border-2 border-dashed border-[#D5D0C2] bg-[#EBE7DF]/60 rounded-3xl p-10 sm:p-16 text-center cursor-not-allowed transition-all opacity-90 shadow-inner">
                <div class="max-w-xl mx-auto space-y-4 card-ui">
                  <div class="w-16 h-16 rounded-3xl bg-[#DFD9CE] border border-[#D5D0C2] text-[#7A7F8E] flex items-center justify-center mx-auto text-3xl shadow-sm">
                    🔒
                  </div>
                  <div>
                    <p class="font-durer text-2xl sm:text-4xl font-bold uppercase tracking-[0.02em] text-[#7A7F8E]">File Upload Disabled</p>
                    <p class="text-base sm:text-lg text-[#5C606E] mt-2.5 font-medium leading-relaxed">
                      An Instagram Reel URL is actively connected above as your primary media source. Click <strong class="text-[#141518] underline cursor-pointer hover:text-[#E50914]" @click.stop="clearUrl">"Clear URL"</strong> above to upload a local media file directly.
                    </p>
                  </div>
                </div>
              </div>

              <!-- State 2: Interactive Dropzone with Premium Warm Tactile Response -->
              <div v-else
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="triggerFileInput"
                :class="isDragging ? 'border-[#E50914] bg-[#E50914]/10 scale-[0.99]' : 'border-[#D5D0C2] hover:border-[#E50914] bg-[#F3EFEB] hover:bg-[#EFEAE4]'"
                class="relative border-2 border-dashed rounded-3xl p-8 sm:p-16 text-center cursor-pointer transition-all duration-500 overflow-hidden shadow-inner"
              >
                <input ref="fileInput" @change="onFileChange" type="file" multiple accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp" class="hidden" />

                <!-- Loaded Asset Preview Deck -->
                <div v-if="uploadedFiles.length > 0" class="space-y-6" @click.stop="triggerFileInput">
                  
                  <!-- Single Video or Image -->
                  <div v-if="uploadedFiles.length === 1" class="space-y-5">
                    <div class="relative w-full max-h-[420px] rounded-2xl overflow-hidden bg-black/95 border border-[#D5D0C2] mx-auto flex items-center justify-center shadow-2xl p-2">
                      <video v-if="uploadedFiles[0].category === 'video'" :src="uploadedFiles[0].url" controls class="max-h-[390px] w-auto mx-auto rounded-xl shadow-lg"></video>
                      <img v-else :src="uploadedFiles[0].url" class="max-h-[390px] w-auto mx-auto rounded-xl object-contain shadow-lg" alt="Preview" />
                      <span class="absolute top-4 left-4 bg-black/85 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 text-xs sm:text-sm card-ui font-extrabold tracking-wider uppercase text-[#00E5FF] shadow-sm">
                        Validated Asset
                      </span>
                    </div>

                    <div class="flex items-center justify-between bg-[#FCFCFA] px-7 py-5 rounded-2xl border border-[#DFDAD0] text-left card-ui shadow-sm">
                      <div class="truncate pr-4">
                        <p class="text-lg sm:text-xl font-extrabold text-[#141518] truncate">{{ uploadedFiles[0].name }}</p>
                        <p class="text-xs sm:text-sm text-[#E50914] font-extrabold uppercase tracking-wide mt-1.5">{{ (uploadedFiles[0].size / (1024 * 1024)).toFixed(2) }} MB &middot; {{ uploadedFiles[0].type }}</p>
                      </div>
                      <button @click="(e) => removeFile(0, e)" type="button" class="px-7 py-3.5 rounded-xl bg-[#E50914]/15 hover:bg-[#E50914] hover:text-white text-[#E50914] card-ui text-sm sm:text-base font-extrabold uppercase tracking-wide transition-all shadow-sm border border-[#E50914]/40 hover:border-transparent shrink-0">
                        Remove Asset
                      </button>
                    </div>
                  </div>

                  <!-- Multi-Slide Carousel Gallery -->
                  <div v-else class="space-y-6">
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[420px] overflow-y-auto p-2 text-left">
                      <div v-for="(item, idx) in uploadedFiles" :key="idx" class="relative group/card rounded-2xl overflow-hidden bg-[#FAFAF8] border border-[#DFDAD0] hover:border-[#E50914] transition-all shadow-md">
                        <div class="h-36 w-full bg-black/90 overflow-hidden flex items-center justify-center relative">
                          <img v-if="item.category === 'image'" :src="item.url" class="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                          <video v-else :src="item.url" class="w-full h-full object-cover"></video>
                          <span class="absolute top-2.5 left-2.5 px-3 py-1 rounded-md bg-black/85 backdrop-blur-md border border-white/20 text-xs card-ui font-extrabold text-[#E50914] uppercase tracking-wider shadow-sm">
                            Slide {{ idx + 1 }}
                          </span>
                        </div>
                        <div class="p-4 flex items-center justify-between bg-[#F4F1EA] border-t border-[#DFDAD0] card-ui">
                          <span class="text-sm sm:text-base text-[#141518] font-bold truncate w-28">{{ item.name }}</span>
                          <button @click="(e) => removeFile(idx, e)" type="button" title="Remove Slide" class="text-white bg-[#E50914]/80 hover:bg-[#E50914] p-1.5 rounded-lg transition-all font-bold text-sm px-3 shadow-sm">
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between bg-[#FCFCFA] border border-[#DFDAD0] px-7 py-5 rounded-2xl card-ui shadow-sm">
                      <span class="text-sm sm:text-base text-[#4A4E5A] font-extrabold uppercase tracking-wide">Tap container to append sequence slides</span>
                      <button @click="clearAllFiles" type="button" class="text-sm sm:text-base text-white font-extrabold uppercase tracking-wider px-7 py-3.5 rounded-xl bg-[#141518] hover:bg-[#E50914] transition-all shadow-md">
                        Clear Deck
                      </button>
                    </div>
                  </div>

                </div>

                <!-- Empty State (Pure Agency Prestige, Warm Ivory Tone) -->
                <div v-else class="space-y-6 py-12 card-ui">
                  <div class="w-20 h-20 rounded-3xl bg-[#FFFFFF] border border-[#DBD6C8] text-[#E50914] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#E50914] group-hover:text-white group-hover:border-[#E50914] transition-all duration-500 shadow-[0_10px_30px_rgba(20,21,24,0.06)] group-hover:shadow-[0_15px_40px_rgba(229,9,20,0.35)]">
                    <svg class="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                  </div>
                  <div>
                    <p class="font-durer text-2xl sm:text-4xl font-bold uppercase tracking-[0.02em] text-[#141518]">Ingest Performance Asset</p>
                    <p class="text-base sm:text-lg lg:text-xl text-[#3E424D] mt-3 font-medium leading-relaxed max-w-2xl mx-auto card-ui">Drop Reel video, carousel slide sequences, or static visual artifacts directly into this high-velocity studio</p>
                  </div>
                  <div class="flex flex-wrap items-center justify-center gap-4 pt-4 text-sm sm:text-base font-bold uppercase tracking-wide text-[#2A2D35] card-ui">
                    <span class="px-6 py-3 rounded-xl bg-white border border-[#DDD8CC] shadow-sm flex items-center gap-2.5">
                      Video &middot; MP4 / MOV
                    </span>
                    <span class="px-6 py-3 rounded-xl bg-white border border-[#DDD8CC] shadow-sm flex items-center gap-2.5">
                      Carousel &middot; JPG / PNG / WEBP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── SLAB 02: TELEMETRY & METRICS MATRIX (DAYLIGHT ARCHITECTURAL PURE IVORY) ─── -->
          <div 
            class="interactive-hover w-full rounded-[2.5rem] bg-[#FAFAF6]/95 backdrop-blur-xl text-[#141518] p-8 sm:p-14 lg:p-20 transition-all duration-500 overflow-hidden shadow-[0_35px_95px_rgba(20,21,24,0.09)] hover:shadow-[0_40px_110px_rgba(20,21,24,0.13)] border border-[#E3E0D6] relative card-ui"
          >
            <!-- Top Specular Hairline -->
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#E50914]/80 to-transparent opacity-80"></div>

            <!-- Interior Decorative Coordinates -->
            <div class="absolute top-6 right-6 font-mono text-[11px] font-bold text-[#9DA1AE] border border-[#DBD6CA] px-3 py-1 rounded-md hidden sm:block uppercase tracking-widest">
              MATRIX_ID: T-MX_2026
            </div>

            <div class="relative z-10 space-y-10">
              <!-- Node Header -->
              <div class="flex items-center gap-4 border-b border-[#E3DEDB] pb-6">
                <span class="text-5xl sm:text-6xl font-durer font-extrabold text-[#E50914] tracking-normal select-none">02</span>
                <span class="h-8 w-[2px] bg-[#DBD5C8]"></span>
                <span class="card-ui text-sm sm:text-base font-extrabold tracking-[0.08em] uppercase text-[#141518]">Telemetry Node // Empirical Performance Matrix</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <!-- Content Format Toggle Architecture -->
                <div class="space-y-3">
                  <label class="card-ui text-sm sm:text-base font-bold uppercase tracking-wide text-[#2A2D35] block">Content Format Architecture</label>
                  <div class="grid grid-cols-3 gap-2 bg-[#EBE7DF] p-2 rounded-2xl border border-[#D8D3C7] shadow-inner">
                    <button 
                      v-for="type in ['Reel', 'Carousel', 'Static Post']" :key="type"
                      @click="contentType = type"
                      type="button"
                      :class="contentType === type ? 'bg-[#E50914] text-white font-extrabold shadow-[0_5px_15px_rgba(229,9,20,0.35)] border border-[#C40711]' : 'text-[#5C606E] hover:text-[#141518] font-semibold hover:bg-white/60'"
                      class="py-4 text-sm sm:text-base rounded-xl transition-all duration-300 card-ui uppercase tracking-wide"
                    >
                      {{ type }}
                    </button>
                  </div>
                </div>

                <!-- Target Distribution Channel -->
                <div class="space-y-3">
                  <label class="card-ui text-sm sm:text-base font-bold uppercase tracking-wide text-[#2A2D35] block">Target Distribution Channel</label>
                  <div class="grid grid-cols-2 gap-2 bg-[#EBE7DF] p-2 rounded-2xl border border-[#D8D3C7] shadow-inner">
                    <button 
                      v-for="plat in ['Instagram', 'LinkedIn']" :key="plat"
                      @click="platform = plat"
                      type="button"
                      :class="platform === plat ? 'bg-[#E50914] text-white font-extrabold shadow-[0_5px_15px_rgba(229,9,20,0.35)] border border-[#C40711]' : 'text-[#5C606E] hover:text-[#141518] font-semibold hover:bg-white/60'"
                      class="py-4 text-sm sm:text-base rounded-xl transition-all duration-300 card-ui uppercase tracking-wide"
                    >
                      {{ plat }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Numeric Performance Inputs -->
              <div class="space-y-5 pt-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-4 border-[#E50914] pl-4">
                  <span class="card-ui text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#141518]">Performance Analytics (Optional except Views)</span>
                  <span class="text-xs sm:text-sm card-ui font-extrabold text-[#0A7B8E] tracking-wider uppercase">Numeric Telemetry Stream</span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <div>
                    <span class="block card-ui text-sm sm:text-base font-bold text-[#2A2D35] uppercase tracking-wide mb-2">Views / Reach *</span>
                    <input v-model="form.views" type="number" placeholder="e.g. 14500" class="w-full px-5 py-4 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-semibold text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all shadow-sm" />
                  </div>

                  <div v-if="contentType === 'Reel'">
                    <span class="block card-ui text-sm sm:text-base font-bold text-[#2A2D35] uppercase tracking-wide mb-2">Watch Time %</span>
                    <input v-model="form.watchTime" type="number" placeholder="e.g. 38" class="w-full px-5 py-4 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-semibold text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all shadow-sm" />
                  </div>

                  <div>
                    <span class="block card-ui text-sm sm:text-base font-bold text-[#2A2D35] uppercase tracking-wide mb-2">Likes</span>
                    <input v-model="form.likes" type="number" placeholder="e.g. 480" class="w-full px-5 py-4 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-semibold text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all shadow-sm" />
                  </div>

                  <div>
                    <span class="block card-ui text-sm sm:text-base font-bold text-[#2A2D35] uppercase tracking-wide mb-2">Comments</span>
                    <input v-model="form.comments" type="number" placeholder="e.g. 24" class="w-full px-5 py-4 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-semibold text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all shadow-sm" />
                  </div>

                  <div>
                    <span class="block card-ui text-sm sm:text-base font-bold text-[#2A2D35] uppercase tracking-wide mb-2">Shares</span>
                    <input v-model="form.shares" type="number" placeholder="e.g. 95" class="w-full px-5 py-4 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-semibold text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all shadow-sm" />
                  </div>

                  <div>
                    <span class="block card-ui text-sm sm:text-base font-bold text-[#2A2D35] uppercase tracking-wide mb-2">Saves</span>
                    <input v-model="form.saves" type="number" placeholder="e.g. 110" class="w-full px-5 py-4 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-semibold text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all shadow-sm" />
                  </div>

                  <div>
                    <span class="block card-ui text-sm sm:text-base font-bold text-[#2A2D35] uppercase tracking-wide mb-2">Profile Visits</span>
                    <input v-model="form.profileVisits" type="number" placeholder="e.g. 310" class="w-full px-5 py-4 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-semibold text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all shadow-sm" />
                  </div>

                  <div>
                    <span class="block card-ui text-sm sm:text-base font-bold text-[#2A2D35] uppercase tracking-wide mb-2">Followers Gained</span>
                    <input v-model="form.followersGained" type="number" placeholder="e.g. 42" class="w-full px-5 py-4 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-semibold text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all shadow-sm" />
                  </div>
                </div>
              </div>

              <!-- Brand Intelligence Context -->
              <div class="space-y-4 pt-8 border-t border-[#E3DEDB]">
                <div class="flex items-center gap-4">
                  <span class="text-3xl sm:text-4xl font-durer font-extrabold text-[#E50914] tracking-normal select-none">03</span>
                  <span class="h-6 w-[2px] bg-[#DBD5C8]"></span>
                  <span class="card-ui text-sm sm:text-base font-extrabold tracking-[0.08em] uppercase text-[#141518]">Brand Intelligence &amp; Audience Context</span>
                </div>
                
                <div>
                  <textarea 
                    v-model="form.brandContext"
                    rows="3"
                    placeholder="e.g. We engineer high-velocity tooling for founders and executives. Our narrative targets early-stage scaleups seeking institutional authority and market governance."
                    class="w-full p-6 rounded-2xl bg-[#FFFFFF] border border-[#D8D3C6] card-ui text-base sm:text-lg font-medium text-[#141518] placeholder-[#9498A4] focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all leading-relaxed resize-none shadow-sm"
                  ></textarea>
                  <p class="card-ui text-sm sm:text-base font-semibold text-[#4A4E5A] mt-3.5 leading-relaxed flex items-center gap-2.5">
                    <span class="text-[#0A7B8E] font-black text-lg">ℹ</span> Provides high-context semantic framing to calibrate our neural prescriptions instead of generic recommendations.
                  </p>
                </div>
              </div>

              <!-- MONOLITHIC SUBMIT ACTION -->
              <div class="pt-6">
                <button
                  @click="runAnalysis"
                  :disabled="currentState === STATES.LOADING"
                  type="button"
                  :class="currentState === STATES.LOADING ? 'bg-[#DCD8CD] text-black/40 border border-[#CECAC0] cursor-not-allowed shadow-none' : 'bg-[#E50914] text-white hover:bg-[#141518] hover:text-white border border-[#C40711] shadow-[0_20px_50px_rgba(229,9,20,0.35)] hover:shadow-[0_25px_60px_rgba(20,21,24,0.25)] hover:scale-[1.01] active:scale-[0.99]'"
                  class="w-full py-6 px-10 rounded-2xl card-ui font-black text-lg sm:text-2xl uppercase tracking-[0.12em] transition-all duration-300 flex items-center justify-center gap-4 group"
                >
                  <span v-if="currentState === STATES.LOADING" class="w-6 h-6 border-3 border-[#141518] border-t-transparent rounded-full animate-spin"></span>
                  <span class="flex items-center gap-3">
                    <span>{{ currentState === STATES.LOADING ? 'NEURAL COMPUTE IN PROGRESS...' : 'EXECUTE 3-NODE DIAGNOSIS' }}</span>
                    <span v-if="currentState !== STATES.LOADING" class="inline-block transition-transform duration-300 group-hover:translate-x-2 font-black text-3xl">→</span>
                  </span>
                </button>
                
                <div class="flex items-center justify-center gap-3 card-ui text-sm sm:text-base text-[#3E424D] font-bold tracking-wide uppercase mt-5">
                  <span>Telemetry securely verified and analyzed in real-time by Klarix neural clusters</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ─── C. LIVE DIAGNOSTIC OUTPUT DECK WITH DAYLIGHT GLASS ARCHIVE & SECOND AMBIENT CGI VIDEO ─── -->
    <section class="relative w-full py-28 sm:py-40 bg-[#EAE6DD] px-6 sm:px-12 overflow-hidden border-t border-[#DCD6C8]">
      
      <!-- Second Ambient Background Video Element (bg-ambient-4.mp4) trimmed & denoised for clean daylight presentation -->
      <div class="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <video
          autoplay
          muted
          loop
          playsinline
          class="w-full h-full object-cover opacity-100 filter contrast-[1.15] brightness-[1.03] saturate-[1.2]"
        >
          <source src="/videos/bg-ambient-4.mp4" type="video/mp4" />
        </video>
        <!-- Gentle top & bottom integration gradients without obscuring center video -->
        <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#F4F1EC] via-[#F4F1EC]/60 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F4F1EC] via-[#F4F1EC]/60 to-transparent"></div>
      </div>

      <div class="max-w-[92rem] mx-auto relative z-10">
        <!-- Editorial Section Header -->
        <div class="mb-20 text-center max-w-4xl mx-auto space-y-6">
          <span class="inline-flex items-center gap-2.5 font-display text-xs font-black uppercase tracking-[0.25em] text-[#E50914] bg-white/90 backdrop-blur-md px-5 py-2 rounded-full border border-[#DED9CC] shadow-sm">
            <span>•</span>
            <span>Algorithmic Prescriptions // Realtime Output</span>
            <span>•</span>
          </span>
          <h2 class="durer-heading text-[7vw] sm:text-[4.8rem] lg:text-[6rem] font-bold text-[#141518] uppercase tracking-[0.01em] leading-none">
            Diagnostic <span class="text-[#E50914] font-display font-black tracking-normal">Verdict.</span>
          </h2>
          <p class="font-display text-base sm:text-lg text-[#555966] font-bold max-w-2xl mx-auto leading-relaxed">
            Neural synthesis of visual metrics, narrative pacing, and strategic performance. Structured interventions designed for immediate audience retention and growth.
          </p>
        </div>

        <div class="relative min-h-[600px] w-full flex flex-col justify-center">

          <!-- 1. IDLE STATE (STANDBY DECK) -->
          <div v-if="currentState === STATES.IDLE" class="p-12 sm:p-20 rounded-[3rem] bg-[#FAFAF7]/95 backdrop-blur-2xl border border-[#E5E0D6] shadow-[0_25px_80px_rgba(20,21,24,0.08)] text-center max-w-4xl mx-auto space-y-8 card-ui">
            <div class="w-20 h-20 rounded-3xl bg-[#E50914]/10 border border-[#E50914]/40 text-[#E50914] flex items-center justify-center mx-auto shadow-inner">
              <span class="font-display text-3xl font-black">⚡</span>
            </div>
            <h3 class="durer-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-[0.02em] text-[#141518]">Neural Processing Nodes on Standby</h3>
            <p class="card-ui text-lg sm:text-xl font-medium text-[#3E424D] max-w-2xl mx-auto leading-relaxed">
              Our 3-node intelligence architecture is calibrated and awaiting your command. Ingest media elements above and execute diagnosis to activate high-precision computational pipelines.
            </p>
          </div>

          <!-- 2. LOADING STATE (NEURAL PIPELINE ACTIVE) -->
          <div v-if="currentState === STATES.LOADING" class="p-12 sm:p-20 rounded-[3rem] bg-[#141518]/95 backdrop-blur-2xl border border-[#333745] shadow-[0_30px_90px_rgba(20,21,24,0.25)] text-[#FAFAF7] text-center max-w-4xl mx-auto space-y-10 card-ui">
            <div class="space-y-4">
              <div class="w-16 h-16 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 class="font-durer text-3xl sm:text-4xl font-extrabold uppercase tracking-wide">Executing 3-Node Assessment</h3>
              <p class="card-ui text-base sm:text-xl font-bold text-[#00E5FF] tracking-wider uppercase animate-pulse">{{ loadingStepText }}</p>
            </div>

            <div class="space-y-4 max-w-lg mx-auto">
              <div class="flex items-center gap-4 p-5 rounded-2xl border transition-all duration-500 shadow-sm card-ui" :class="activeAgentStep >= 1 ? 'border-[#00E5FF]/60 bg-[#00E5FF]/15 text-white font-extrabold shadow-[0_0_25px_rgba(0,229,255,0.3)]' : 'border-white/10 text-white/40 bg-[#121522]'">
                <span class="w-4 h-4 rounded-full shrink-0 shadow-sm" :class="activeAgentStep > 1 ? 'bg-white shadow-[0_0_10px_#ffffff]' : (activeAgentStep === 1 ? 'bg-[#00E5FF] animate-ping shadow-[0_0_10px_#00E5FF]' : 'bg-white/20')"></span>
                <span class="card-ui text-sm sm:text-base uppercase font-extrabold tracking-wide">Node 01 // Visual &amp; Spatial Analyst</span>
              </div>
              <div class="flex items-center gap-4 p-5 rounded-2xl border transition-all duration-500 shadow-sm card-ui" :class="activeAgentStep >= 2 ? 'border-[#00E5FF]/60 bg-[#00E5FF]/15 text-white font-extrabold shadow-[0_0_25px_rgba(0,229,255,0.3)]' : 'border-white/10 text-white/40 bg-[#121522]'">
                <span class="w-4 h-4 rounded-full shrink-0 shadow-sm" :class="activeAgentStep > 2 ? 'bg-white shadow-[0_0_10px_#ffffff]' : (activeAgentStep === 2 ? 'bg-[#00E5FF] animate-ping shadow-[0_0_10px_#00E5FF]' : 'bg-white/20')"></span>
                <span class="card-ui text-sm sm:text-base uppercase font-extrabold tracking-wide">Node 02 // Retention &amp; Trend Strategy</span>
              </div>
              <div class="flex items-center gap-4 p-5 rounded-2xl border transition-all duration-500 shadow-sm card-ui" :class="activeAgentStep >= 3 ? 'border-[#00E5FF]/60 bg-[#00E5FF]/15 text-white font-extrabold shadow-[0_0_25px_rgba(0,229,255,0.3)]' : 'border-white/10 text-white/40 bg-[#121522]'">
                <span class="w-4 h-4 rounded-full shrink-0 shadow-sm" :class="activeAgentStep === 3 ? 'bg-[#00E5FF] animate-ping shadow-[0_0_10px_#00E5FF]' : 'bg-white/20'"></span>
                <span class="card-ui text-sm sm:text-base uppercase font-extrabold tracking-wide">Node 03 // Viral Script Synthesis</span>
              </div>
            </div>
          </div>

          <!-- 3. ERROR STATE -->
          <div v-if="currentState === STATES.ERROR" class="p-10 sm:p-16 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl border-l-8 border-[#E50914] border border-[#333745] shadow-[0_30px_90px_rgba(229,9,20,0.4)] text-white text-center space-y-7 card-ui">
            <div class="w-20 h-20 rounded-3xl bg-[#E50914]/25 border border-[#E50914] text-[#E50914] flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(229,9,20,0.4)]">
              <span class="font-durer text-4xl font-black">!</span>
            </div>
            <h3 class="font-durer text-3xl sm:text-5xl font-extrabold uppercase tracking-wide">Execution Exception</h3>
            <p class="card-ui text-lg sm:text-xl font-medium text-white/90 max-w-2xl mx-auto leading-relaxed">{{ errorMessage }}</p>
            
            <div class="pt-4">
              <button 
                @click="runAnalysis" 
                type="button"
                class="px-12 py-5 rounded-2xl bg-[#E50914] hover:bg-white hover:text-[#111111] border border-white/20 text-white card-ui font-extrabold uppercase tracking-widest text-sm sm:text-base transition-all shadow-[0_20px_50px_rgba(229,9,20,0.5)] hover:scale-105"
              >
                Re-Execute Diagnostics →
              </button>
            </div>
          </div>

          <!-- 4 & 5. PARTIAL / COMPLETE STATES (EXECUTIVE RESULTS DECK) -->
          <div v-if="(currentState === STATES.PARTIAL || currentState === STATES.COMPLETE || diagnosis) && currentState !== STATES.ERROR" class="space-y-12 card-ui">
            
            <!-- CARD 1: EXTRACTED TRANSCRIPT -->
            <div v-if="uploadedFiles.some(f => f.category === 'video') && diagnosis" class="p-8 sm:p-12 rounded-3xl bg-[#141518]/95 backdrop-blur-2xl text-white border border-[#333745] shadow-[0_25px_80px_rgba(0,0,0,0.25)] space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 card-ui text-sm sm:text-base font-bold uppercase tracking-wider text-[#00E5FF]">
                  <span class="w-3 h-3 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]"></span>
                  <span>EXTRACTED AUDIO SPEECH TRANSCRIPT</span>
                  <span class="text-xs text-white/90 px-3.5 py-1.5 rounded-lg bg-white/10 uppercase border border-white/15 font-extrabold">Audio Node</span>
                </div>
                <button @click="isTranscriptOpen = !isTranscriptOpen" type="button" class="card-ui text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white/80 hover:text-[#00E5FF] px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#00E5FF] transition-all">
                  {{ isTranscriptOpen ? 'Hide Transcript ▲' : 'Show Transcript ▼' }}
                </button>
              </div>

              <div v-if="isTranscriptOpen" class="p-7 rounded-2xl bg-[#1A1E2E] border border-white/15 card-ui text-base sm:text-lg font-medium text-white/90 leading-relaxed whitespace-pre-wrap shadow-inner">
                {{ diagnosis.extracted_transcript || diagnosis.transcript_quality || 'No spoken dialogue detected in media file.' }}
              </div>
            </div>

            <!-- CARD 2: WHAT WORKED ✓ -->
            <div v-if="diagnosis" class="p-8 sm:p-14 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl text-white border-t-4 border-t-[#00E5FF] border border-[#333745] shadow-[0_35px_100px_rgba(0,0,0,0.3)] space-y-8 relative overflow-hidden">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-6 gap-4">
                <h3 class="font-durer text-3xl sm:text-4xl font-black uppercase tracking-[0.02em] text-white flex items-center gap-4">
                  <span class="w-11 h-11 rounded-2xl bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/50 flex items-center justify-center card-ui font-black text-xl shadow-[0_0_20px_rgba(0,229,255,0.4)]">✓</span>
                  <span>Validated Mechanics</span>
                </h3>
                <button @click="copyText(copyWhatWorked, 'worked')" type="button" class="px-7 py-3.5 rounded-xl bg-white/15 hover:bg-[#00E5FF] hover:text-black border border-white/20 text-white card-ui text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all shadow-md self-start sm:self-auto">
                  {{ copiedId === 'worked' ? 'COPIED TO CLIPBOARD ✓' : 'COPY VALIDATIONS' }}
                </button>
              </div>
              <ul class="space-y-4 card-ui text-base sm:text-lg text-white/95 font-medium leading-relaxed">
                <li v-for="(item, idx) in (diagnosis.what_worked || [])" :key="idx" class="flex items-start gap-4 p-5 rounded-2xl bg-[#1A1E2E]/80 border border-white/10 hover:border-[#00E5FF]/50 transition-all">
                  <span class="text-[#00E5FF] font-black text-2xl leading-none mt-0.5 shrink-0">•</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>

            <!-- CARD 3: WHAT FAILED ✗ -->
            <div v-if="diagnosis" class="p-8 sm:p-14 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl text-white border-t-4 border-t-[#E50914] border border-[#333745] shadow-[0_35px_100px_rgba(229,9,20,0.25)] space-y-8 relative overflow-hidden">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-6 gap-4">
                <h3 class="font-durer text-3xl sm:text-4xl font-black uppercase tracking-[0.02em] text-white flex items-center gap-4">
                  <span class="w-11 h-11 rounded-2xl bg-[#E50914]/30 text-[#E50914] border border-[#E50914]/60 flex items-center justify-center card-ui font-black text-xl shadow-[0_0_20px_rgba(229,9,20,0.5)]">✗</span>
                  <span>Retention Fractures</span>
                </h3>
                <button @click="copyText(copyWhatFailed, 'failed')" type="button" class="px-7 py-3.5 rounded-xl bg-white/15 hover:bg-[#E50914] border border-white/20 text-white card-ui text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all shadow-md self-start sm:self-auto">
                  {{ copiedId === 'failed' ? 'COPIED TO CLIPBOARD ✓' : 'COPY FRACTURES' }}
                </button>
              </div>
              
              <ul class="space-y-4 card-ui text-base sm:text-lg text-white/95 font-medium leading-relaxed">
                <li v-for="(item, idx) in (diagnosis.what_failed || [])" :key="idx" class="flex items-start gap-4 p-5 rounded-2xl bg-[#1A1E2E]/80 border border-white/10 hover:border-[#E50914]/60 transition-all">
                  <span class="text-[#E50914] font-black text-2xl leading-none mt-0.5 shrink-0">•</span>
                  <span>{{ item }}</span>
                </li>
                <li v-if="diagnosis.retention_drop_point && diagnosis.retention_drop_reason" class="flex items-start gap-4 text-white bg-[#E50914]/25 p-6 rounded-2xl border border-[#E50914]/60 shadow-[0_10px_30px_rgba(229,9,20,0.3)]">
                  <span class="text-[#E50914] font-black text-2xl leading-none mt-0.5 shrink-0">▼</span>
                  <span><strong class="text-[#FF3A4A] uppercase font-black tracking-wider block text-xs sm:text-sm mb-1">Critical Drop-Off Threshold // {{ diagnosis.retention_drop_point }}</strong> {{ diagnosis.retention_drop_reason }}</span>
                </li>
              </ul>

              <div v-if="diagnosis.overall_diagnosis" class="pt-6 border-t border-white/15 card-ui text-base sm:text-lg font-medium text-white leading-relaxed bg-[#1A1E2E] p-7 rounded-3xl border border-white/15 shadow-inner">
                <span class="font-bold uppercase text-xs sm:text-sm tracking-widest block mb-3 text-[#E50914] flex items-center gap-2.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#E50914]"></span>
                  <span>AI Neural Diagnostic Verdict:</span>
                </span>
                {{ diagnosis.overall_diagnosis }}
              </div>
            </div>

            <!-- CARD 4: STRATEGIC ROADMAP → -->
            <div v-if="strategy" class="p-8 sm:p-14 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl text-white border border-[#333745] shadow-[0_35px_100px_rgba(0,0,0,0.3)] space-y-8 relative overflow-hidden">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-6 gap-4">
                <h3 class="font-durer text-3xl sm:text-4xl font-black uppercase tracking-[0.02em] text-white flex items-center gap-4">
                  <span class="text-[#E50914] text-4xl leading-none">→</span>
                  <span>Strategic Roadmap</span>
                </h3>
                <button @click="copyText(copyStrategy, 'strategy')" type="button" class="px-7 py-3.5 rounded-xl bg-white/15 hover:bg-[#E50914] border border-white/20 text-white card-ui text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all shadow-md self-start sm:self-auto">
                  {{ copiedId === 'strategy' ? 'COPIED ROADMAP ✓' : 'COPY ROADMAP' }}
                </button>
              </div>

              <div class="space-y-5 card-ui text-base sm:text-lg text-white font-medium divide-y divide-white/10">
                <div v-if="strategy.priority_fix" class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-[#E50914] sm:w-1/3 shrink-0">Priority Fix</span>
                  <span class="text-white text-base sm:text-lg sm:w-2/3">{{ strategy.priority_fix }}</span>
                </div>
                <div v-if="strategy.next_content_type" class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-white/75 sm:w-1/3 shrink-0">Format &amp; Angle</span>
                  <span class="text-white text-base sm:text-lg sm:w-2/3 bg-white/10 px-5 py-2.5 rounded-xl border border-white/15 inline-block">{{ strategy.next_content_type }} &middot; {{ strategy.next_content_angle }}</span>
                </div>
                <div v-if="strategy.hook_direction" class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-white/75 sm:w-1/3 shrink-0">Hook Direction</span>
                  <span class="text-white text-base sm:text-lg sm:w-2/3">{{ strategy.hook_direction }}</span>
                </div>
                <div v-if="strategy.trend_insight" class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-[#00E5FF] sm:w-1/3 shrink-0">Trend Intelligence</span>
                  <span class="text-white text-base sm:text-lg sm:w-2/3">{{ strategy.trend_insight }}</span>
                </div>
                <div v-if="strategy.competitor_gap" class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-white/75 sm:w-1/3 shrink-0">Competitor Gap</span>
                  <span class="text-white text-base sm:text-lg sm:w-2/3">{{ strategy.competitor_gap }}</span>
                </div>
                <div v-if="strategy.best_time_to_post" class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-white/75 sm:w-1/3 shrink-0">Publishing Window</span>
                  <span class="text-white text-base sm:text-lg sm:w-2/3 font-extrabold text-[#00E5FF]">{{ strategy.best_time_to_post }}</span>
                </div>
                <div v-if="strategy.estimated_impact" class="pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <span class="text-xs sm:text-sm uppercase font-black tracking-wider text-[#E50914] sm:w-1/3 shrink-0">Expected Velocity</span>
                  <span class="text-white text-2xl sm:text-3xl font-extrabold sm:w-2/3">{{ strategy.estimated_impact }}</span>
                </div>
                <div v-if="strategy.strategic_reasoning" class="pt-6">
                  <span class="block text-xs sm:text-sm uppercase font-black tracking-widest text-white/80 mb-3">Strategic Reasoning Architecture:</span>
                  <p class="text-base sm:text-lg text-white/90 leading-relaxed bg-[#1A1E2E] p-7 rounded-3xl border border-white/15 shadow-inner">{{ strategy.strategic_reasoning }}</p>
                </div>
              </div>
            </div>

            <!-- CARD 5: PRODUCTION TELEPROMPTER SCRIPT DECK -->
            <div v-if="script" class="p-8 sm:p-14 rounded-[2.5rem] bg-[#141518]/95 backdrop-blur-2xl text-white border-2 border-[#E50914]/60 shadow-[0_45px_120px_rgba(229,9,20,0.3)] space-y-10 relative overflow-hidden">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-6 gap-4 relative z-10">
                <h3 class="font-durer text-3xl sm:text-4xl font-black uppercase tracking-[0.02em] text-white flex items-center gap-4">
                  <span class="w-4 h-4 rounded-full bg-[#E50914] animate-pulse"></span>
                  <span>Production Teleprompter</span>
                </h3>
                <button @click="copyText(copyScript, 'script')" type="button" class="px-8 py-4 rounded-xl bg-[#E50914] hover:bg-white hover:text-[#111111] text-white shadow-[0_15px_35px_rgba(229,9,20,0.5)] border border-white/20 card-ui text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:scale-105 self-start sm:self-auto">
                  {{ copiedId === 'script' ? 'SCRIPT COPIED TO CLIPBOARD ✓' : 'COPY FULL SCRIPT DECK' }}
                </button>
              </div>

              <!-- Script Sections -->
              <div class="space-y-6 relative z-10">
                <div v-if="script.hook" class="p-6 sm:p-8 rounded-3xl bg-[#E50914]/20 border border-[#E50914]/60 shadow-[0_15px_40px_rgba(229,9,20,0.3)]">
                  <div class="card-ui text-xs sm:text-sm font-black text-[#E50914] uppercase tracking-widest mb-3 flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full bg-[#E50914] shadow-[0_0_10px_#E50914]"></span>
                    <span>HOOK &middot; 0:00–0:03 // CRITICAL RETENTION WINDOW</span>
                  </div>
                  <div class="card-ui text-xl sm:text-3xl font-bold text-white leading-relaxed whitespace-pre-wrap">{{ script.hook }}</div>
                </div>

                <div v-if="script.body" class="p-6 sm:p-8 rounded-3xl bg-[#141728] border border-white/15 shadow-inner">
                  <div class="card-ui text-xs sm:text-sm font-black text-white/80 uppercase tracking-widest mb-3">BODY &middot; 0:03–0:25 // NARRATIVE ENGAGEMENT</div>
                  <div class="card-ui text-base sm:text-xl font-medium text-white/95 leading-relaxed whitespace-pre-wrap">{{ script.body }}</div>
                </div>

                <div v-if="script.cta" class="p-6 sm:p-8 rounded-3xl bg-[#141728] border border-white/25 shadow-md">
                  <div class="card-ui text-xs sm:text-sm font-black text-[#00E5FF] uppercase tracking-widest mb-3 flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full bg-[#00E5FF]"></span>
                    <span>CALL TO ACTION &middot; 0:25–0:32 // CONVERSION ENGINE</span>
                  </div>
                  <div class="card-ui text-lg sm:text-xl font-bold text-white leading-relaxed whitespace-pre-wrap">{{ script.cta }}</div>
                </div>

                <div v-if="script.text_overlays && script.text_overlays.length" class="p-6 sm:p-8 rounded-3xl bg-[#0E111E] border border-white/15">
                  <div class="card-ui text-xs sm:text-sm font-black text-white/85 uppercase tracking-wider mb-4 flex items-center gap-2.5">
                    <span class="w-2 h-2 rounded-full bg-white/60"></span>
                    <span>DYNAMIC TEXT OVERLAYS // SCREEN LAYER</span>
                  </div>
                  <ol class="list-decimal list-inside card-ui text-base sm:text-lg text-white/95 space-y-3 font-medium">
                    <li v-for="(ov, idx) in script.text_overlays" :key="idx" class="pl-2">{{ ov }}</li>
                  </ol>
                </div>

                <div v-if="script.b_roll_suggestions && script.b_roll_suggestions.length" class="p-6 sm:p-8 rounded-3xl bg-[#0E111E] border border-white/15">
                  <div class="card-ui text-xs sm:text-sm font-black text-white/85 uppercase tracking-wider mb-4 flex items-center gap-2.5">
                    <span class="w-2 h-2 rounded-full bg-white/60"></span>
                    <span>B-ROLL SHOTS &amp; VISUAL DIRECTION // CUTAWAYS</span>
                  </div>
                  <ol class="list-decimal list-inside card-ui text-base sm:text-lg text-white/95 space-y-3 font-medium">
                    <li v-for="(broll, idx) in script.b_roll_suggestions" :key="idx" class="pl-2">{{ broll }}</li>
                  </ol>
                </div>

                <div v-if="script.delivery_notes" class="p-6 rounded-2xl bg-white/5 border border-white/15 card-ui text-sm sm:text-base font-medium text-white/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span><strong class="text-[#00E5FF] font-extrabold uppercase tracking-wider">Delivery Notes:</strong> {{ script.delivery_notes }}</span>
                  <span v-if="script.estimated_length" class="font-extrabold text-xs sm:text-sm shrink-0 bg-[#E50914] text-white px-5 py-2.5 rounded-xl tracking-widest uppercase shadow-md border border-white/20">{{ script.estimated_length }}</span>
                </div>
              </div>
            </div>

            <div v-if="currentState === STATES.COMPLETE" class="pt-12 text-center relative z-10">
              <a 
                href="https://instagram.com/piyush._maharana" 
                target="_blank"
                class="inline-flex items-center gap-4 px-12 py-6 rounded-2xl bg-[#111420] hover:bg-[#E50914] border border-white/20 text-base font-extrabold text-white uppercase tracking-wider transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:scale-105 card-ui"
              >
                <span class="w-3 h-3 rounded-full bg-[#00E5FF] group-hover:bg-white transition-colors"></span>
                <span>Follow the architecture &middot; @piyush._maharana →</span>
              </a>
            </div>

          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* Crisp Arial / Geometric UI font styling specifically engineered for high-density diagnostic cards */
.card-ui {
  font-family: Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif !important;
  letter-spacing: 0.01em;
}

/* Custom high-contrast executive scrollbar and smooth transitions for media decks */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: rgba(14, 17, 28, 0.6);
}
::-webkit-scrollbar-thumb {
  background: rgba(229, 9, 20, 0.6);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(229, 9, 20, 1);
}

@media (max-width: 640px) {
  .editorial-heading, .durer-heading {
    word-break: break-word;
  }
}
</style>