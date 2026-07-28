<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import NavBar from '../components/NavBar.vue'

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
  if (uploadedFiles.value.length === 0 && (!form.views || String(form.views).trim() === '')) {
    errorMessage.value = "Missing Content or Data: Please attach your carousel slides, reel, or image post, or provide your performance metrics (Views / Reach *) before running an analysis."
    currentState.value = STATES.ERROR
    return
  }

  errorMessage.value = ''
  diagnosis.value = null
  strategy.value = null
  script.value = null
  
  currentState.value = STATES.LOADING
  activeAgentStep.value = 1
  loadingStepText.value = "Transmitting data to secure Klarix server..."

  try {
    // Package data to send to your Express Backend
    const formData = new FormData()
    if (uploadedFiles.value.length > 0) {
      formData.append('mediaFile', uploadedFiles.value[0].file)
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

    // Fake UX Timer to make the UI look active while the backend does all the work
    const uxTimer = setInterval(() => {
      if (activeAgentStep.value < 3) {
        activeAgentStep.value++
        loadingStepText.value = activeAgentStep.value === 2 
          ? "Agent 2: Building Strategy & Trend Insights..." 
          : "Agent 3: Synthesizing Ready-to-Record Script..."
      }
    }, 7000)

    // Call your local backend server
    const response = await fetch('http://localhost:3001/api/analyse', {
      method: 'POST',
      body: formData
    })

    clearInterval(uxTimer) // Stop the UX timer

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || `Backend server error: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      // Map backend outputs to frontend UI state
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

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
  }, 100)
})
</script>

<template>
  <div class="relative min-h-screen bg-[#050811] text-slate-100 font-body overflow-x-hidden selection:bg-indigo-500/30">
    
    <!-- Background Ambient Glows -->
    <div class="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none z-0"></div>
    <div class="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none z-0"></div>
    <div class="fixed top-[40%] right-[15%] w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[130px] pointer-events-none z-0"></div>

    <NavBar />

    <main class="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-28 sm:pt-32 pb-24">
      
      <!-- Header Section -->
      <div 
        class="text-center md:text-left mb-10 sm:mb-12 transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        :class="isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'"
      >
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-[-0.03em] text-white">
          Social Performance <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400">Analyser</span>
        </h1>
        <p class="text-slate-400 text-sm sm:text-base max-w-2xl mt-2 font-normal">
          Ingest your social assets and analytics below. Our specialized 3-agent AI pipeline extracts retention bottlenecks and crafts your next high-performing post.
        </p>
      </div>

      <!-- WORKSPACE GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        
        <!-- ================= LEFT COLUMN: INPUT ENGINE ================= -->
        <div 
          class="lg:col-span-6 space-y-8 transition-all duration-[1000ms] delay-100 ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-32 opacity-0'"
        >
          <div class="p-6 sm:p-9 rounded-[2.5rem] bg-[#0b0f1b]/90 backdrop-blur-2xl border border-slate-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.25)] hover:border-indigo-500/40 transition-all duration-500 space-y-9">
            
            <!-- STEP 1: UPLOAD CONTENT -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm">1</div>
                  <h2 class="text-lg sm:text-xl font-bold font-display text-white tracking-tight">Upload Your Content</h2>
                </div>
                <span v-if="uploadedFiles.length > 1" class="text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/40 animate-pulse">
                  📸 Carousel Deck ({{ uploadedFiles.length }} Slides)
                </span>
              </div>
              
              <div 
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="triggerFileInput"
                :class="isDragging ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'border-slate-800 hover:border-slate-700 bg-[#070a14]'"
                class="relative border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 group overflow-hidden"
              >
                <input ref="fileInput" @change="onFileChange" type="file" multiple accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp" class="hidden" />

                <!-- Files Loaded Preview Deck -->
                <div v-if="uploadedFiles.length > 0" class="space-y-4" @click.stop="triggerFileInput">
                  
                  <!-- CASE 1: Single Video or Single Image -->
                  <div v-if="uploadedFiles.length === 1" class="space-y-3">
                    <div class="relative w-full max-h-[340px] rounded-2xl overflow-hidden bg-black/50 border border-slate-700 mx-auto flex items-center justify-center shadow-lg">
                      <video v-if="uploadedFiles[0].category === 'video'" :src="uploadedFiles[0].url" controls class="max-h-[340px] w-auto mx-auto rounded-xl"></video>
                      <img v-else :src="uploadedFiles[0].url" class="max-h-[340px] w-auto mx-auto rounded-xl object-contain" alt="Preview" />
                    </div>

                    <div class="flex items-center justify-between bg-slate-900/90 px-4 py-3 rounded-2xl border border-slate-800 text-left">
                      <div class="truncate pr-3">
                        <p class="text-xs font-semibold text-slate-200 truncate">{{ uploadedFiles[0].name }}</p>
                        <p class="text-[10px] font-mono text-slate-400">{{ (uploadedFiles[0].size / (1024 * 1024)).toFixed(2) }} MB &middot; {{ uploadedFiles[0].type }}</p>
                      </div>
                      <button @click="(e) => removeFile(0, e)" type="button" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors shrink-0">
                        Remove
                      </button>
                    </div>
                  </div>

                  <!-- CASE 2: Multi-Slide Carousel Gallery -->
                  <div v-else class="space-y-4">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto p-1 text-left">
                      <div v-for="(item, idx) in uploadedFiles" :key="idx" class="relative group/card rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-sm">
                        <div class="h-28 w-full bg-black/40 overflow-hidden flex items-center justify-center relative">
                          <img v-if="item.category === 'image'" :src="item.url" class="w-full h-full object-cover group-hover/card:scale-105 transition-transform" />
                          <video v-else :src="item.url" class="w-full h-full object-cover"></video>
                          <span class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur border border-slate-700 text-[9px] font-mono font-bold text-indigo-300">
                            Slide {{ idx + 1 }}
                          </span>
                        </div>
                        <div class="p-2 flex items-center justify-between bg-[#080b15]">
                          <span class="text-[10px] text-slate-400 truncate w-24">{{ item.name }}</span>
                          <button @click="(e) => removeFile(idx, e)" type="button" title="Remove Slide" class="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 p-1 rounded transition-colors">
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/30 px-4 py-2.5 rounded-2xl">
                      <span class="text-xs text-indigo-200 font-medium">Click box to attach more slides or slides in sequence</span>
                      <button @click="clearAllFiles" type="button" class="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all">
                        Clear All
                      </button>
                    </div>
                  </div>

                </div>

                <!-- Empty State -->
                <div v-else class="space-y-3 py-6">
                  <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-white">Drag & drop your post, reel, or multiple carousel slides here</p>
                    <p class="text-xs text-slate-400 mt-1">Or click to browse from your device (select multiple images for Carousels)</p>
                  </div>
                  <div class="flex items-center justify-center gap-2 pt-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    <span class="px-2 py-1 rounded-md bg-slate-900 border border-slate-800">Video &middot; MP4, MOV (max 50MB)</span>
                    <span class="px-2 py-1 rounded-md bg-slate-900 border border-slate-800">Carousels &middot; Multiple JPG, PNG, WEBP</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- STEP 2: POST DETAILS & TELEMETRY -->
            <div class="space-y-6 pt-6 border-t border-slate-800/80">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400 font-mono font-bold text-sm">2</div>
                <h2 class="text-lg sm:text-xl font-bold font-display text-white tracking-tight">Post Details & Telemetry</h2>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <!-- Content Type -->
                <div class="space-y-2">
                  <label class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Content Type</label>
                  <div class="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button 
                      v-for="type in ['Reel', 'Carousel', 'Static Post']" :key="type"
                      @click="contentType = type"
                      type="button"
                      :class="contentType === type ? 'bg-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.5)]' : 'text-slate-400 hover:text-slate-200'"
                      class="py-2 text-xs rounded-xl transition-all duration-200"
                    >
                      {{ type }}
                    </button>
                  </div>
                </div>

                <!-- Target Platform -->
                <div class="space-y-2">
                  <label class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Target Platform</label>
                  <div class="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button 
                      v-for="plat in ['Instagram', 'LinkedIn']" :key="plat"
                      @click="platform = plat"
                      type="button"
                      :class="platform === plat ? 'bg-purple-600 text-white font-bold shadow-[0_0_12px_rgba(168,85,247,0.5)]' : 'text-slate-400 hover:text-slate-200'"
                      class="py-2 text-xs rounded-xl transition-all duration-200"
                    >
                      {{ plat }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Performance Numbers -->
              <div class="space-y-4">
                <label class="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Performance Analytics (Optional except Views)</span>
                  <span class="text-[10px] font-mono text-slate-500">Numerical Data Only</span>
                </label>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span class="block text-[11px] font-medium text-slate-400 mb-1">Views / Reach *</span>
                    <input v-model="form.views" type="number" placeholder="e.g. 14500" class="w-full px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>

                  <div v-if="contentType === 'Reel'" class="animate-fadeIn">
                    <span class="block text-[11px] font-medium text-slate-400 mb-1">Watch Time % (Reels)</span>
                    <input v-model="form.watchTime" type="number" placeholder="e.g. 38%" class="w-full px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>

                  <div>
                    <span class="block text-[11px] font-medium text-slate-400 mb-1">Likes</span>
                    <input v-model="form.likes" type="number" placeholder="e.g. 480" class="w-full px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>

                  <div>
                    <span class="block text-[11px] font-medium text-slate-400 mb-1">Comments</span>
                    <input v-model="form.comments" type="number" placeholder="e.g. 24" class="w-full px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>

                  <div>
                    <span class="block text-[11px] font-medium text-slate-400 mb-1">Shares</span>
                    <input v-model="form.shares" type="number" placeholder="e.g. 95" class="w-full px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>

                  <div>
                    <span class="block text-[11px] font-medium text-slate-400 mb-1">Saves</span>
                    <input v-model="form.saves" type="number" placeholder="e.g. 110" class="w-full px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>

                  <div>
                    <span class="block text-[11px] font-medium text-slate-400 mb-1">Profile Visits</span>
                    <input v-model="form.profileVisits" type="number" placeholder="e.g. 310" class="w-full px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>

                  <div>
                    <span class="block text-[11px] font-medium text-slate-400 mb-1">Followers Gained</span>
                    <input v-model="form.followersGained" type="number" placeholder="e.g. 42" class="w-full px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            <!-- STEP 3: BRAND CONTEXT -->
            <div class="space-y-4 pt-6 border-t border-slate-800/80">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-400 font-mono font-bold text-sm">3</div>
                <h2 class="text-lg sm:text-xl font-bold font-display text-white tracking-tight">Tell Klarix About Your Brand</h2>
              </div>
              
              <div>
                <textarea 
                  v-model="form.brandContext"
                  rows="3"
                  placeholder="e.g. I'm a Data Science student building an AI tool for founders. My audience is early-stage entrepreneurs and personal brands looking to scale."
                  class="w-full p-4 rounded-2xl bg-[#070a14] border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed resize-none"
                ></textarea>
                <p class="text-[11px] text-slate-500 mt-1.5 italic">This helps Klarix give you tailored strategic guidance instead of generic tips.</p>
              </div>
            </div>

            <!-- SUBMIT BUTTON & LOADING STATE -->
            <div class="pt-4">
              <button
                @click="runAnalysis"
                :disabled="currentState === STATES.LOADING"
                type="button"
                :class="currentState === STATES.LOADING ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white shadow-[0_0_35px_rgba(99,102,241,0.5)] hover:shadow-[0_0_50px_rgba(168,85,247,0.7)] hover:scale-[1.01] active:scale-[0.99]'"
                class="w-full py-4 px-8 rounded-2xl font-display font-extrabold text-base uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3"
              >
                <span v-if="currentState === STATES.LOADING" class="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                <span>{{ currentState === STATES.LOADING ? 'Analysing...' : 'Analyse My Content →' }}</span>
              </button>
              
              <p class="text-center text-xs text-slate-500 mt-3">
                By clicking, you agree to our terms. Your content is processed securely on the Klarix backend API.
              </p>
            </div>

          </div>
        </div>

        <!-- ================= RIGHT COLUMN: LIVE AI OUTPUT DECK ================= -->
        <div 
          class="lg:col-span-6 transition-all duration-[1000ms] delay-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-32 opacity-0'"
        >
          <!-- 1. IDLE STATE: EMPTY -->
          <div v-if="currentState === STATES.IDLE"></div>

          <!-- 2. LOADING STATE: SHOW REAL-TIME AGENT STEPS ONLY -->
          <div v-if="currentState === STATES.LOADING && !diagnosis" class="p-8 sm:p-12 rounded-[2.5rem] bg-[#0b0f1b]/90 backdrop-blur-2xl border border-indigo-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-8 animate-fadeIn">
            <div class="text-center space-y-4">
              <div class="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(99,102,241,0.4)] animate-pulse">
                <span class="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
              </div>
              <h3 class="text-xl font-bold font-display text-white">Executing 3-Agent AI Pipeline</h3>
              <p class="text-sm font-mono text-indigo-400 animate-pulse">{{ loadingStepText }}</p>
            </div>

            <div class="space-y-4 max-w-sm mx-auto pt-2">
              <div class="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border transition-all" :class="activeAgentStep >= 1 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 opacity-40'">
                <span class="w-2.5 h-2.5 rounded-full" :class="activeAgentStep > 1 ? 'bg-emerald-400' : (activeAgentStep === 1 ? 'bg-indigo-400 animate-ping' : 'bg-slate-600')"></span>
                <span class="text-xs font-semibold" :class="activeAgentStep >= 1 ? 'text-slate-200' : 'text-slate-500'">Agent 1: Performance Analyst</span>
              </div>
              <div class="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border transition-all" :class="activeAgentStep >= 2 ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-800 opacity-40'">
                <span class="w-2.5 h-2.5 rounded-full" :class="activeAgentStep > 2 ? 'bg-blue-400' : (activeAgentStep === 2 ? 'bg-blue-400 animate-ping' : 'bg-slate-600')"></span>
                <span class="text-xs font-semibold" :class="activeAgentStep >= 2 ? 'text-slate-200' : 'text-slate-500'">Agent 2: Strategist & Trend Intelligence</span>
              </div>
              <div class="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border transition-all" :class="activeAgentStep >= 3 ? 'border-purple-500/40 bg-purple-500/5' : 'border-slate-800 opacity-40'">
                <span class="w-2.5 h-2.5 rounded-full" :class="activeAgentStep === 3 ? 'bg-purple-400 animate-ping' : 'bg-slate-600'"></span>
                <span class="text-xs font-semibold" :class="activeAgentStep >= 3 ? 'text-slate-200' : 'text-slate-500'">Agent 3: Viral Scriptwriter</span>
              </div>
            </div>
          </div>

          <!-- 3. ERROR STATE -->
          <div v-if="currentState === STATES.ERROR" class="p-8 sm:p-10 rounded-[2.5rem] bg-rose-950/20 backdrop-blur-2xl border border-rose-500/40 shadow-[0_20px_60px_rgba(244,63,94,0.15)] text-center space-y-6 animate-fadeIn">
            <div class="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold font-display text-white">Execution Failed or Missing Input</h3>
            <p class="text-sm font-mono text-rose-300 max-w-md mx-auto">{{ errorMessage }}</p>
            
            <div class="pt-2">
              <button 
                @click="runAnalysis" 
                type="button"
                class="px-8 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]"
              >
                Try Again
              </button>
            </div>
          </div>

          <!-- 4 & 5. PARTIAL / COMPLETE STATES -->
          <div v-if="(currentState === STATES.PARTIAL || currentState === STATES.COMPLETE || diagnosis) && currentState !== STATES.ERROR" class="space-y-6 animate-fadeIn">
            
            <!-- CARD 1: EXTRACTED TRANSCRIPT -->
            <div v-if="uploadedFiles.some(f => f.category === 'video') && diagnosis" class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-300 space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <span>💬 Extracted Transcript</span>
                  <span class="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800">Audio / Video</span>
                </div>
                <button @click="isTranscriptOpen = !isTranscriptOpen" type="button" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                  {{ isTranscriptOpen ? 'Hide transcript ▲' : 'Show transcript ▼' }}
                </button>
              </div>

              <div v-if="isTranscriptOpen" class="p-4 rounded-2xl bg-[#070a14] border border-slate-800/80 font-mono text-xs text-slate-400 leading-relaxed whitespace-pre-wrap animate-fadeIn">
                {{ diagnosis.extracted_transcript || diagnosis.transcript_quality || 'No speech detected or silent video stream.' }}
              </div>
            </div>

            <!-- CARD 2: WHAT WORKED ✓ -->
            <div v-if="diagnosis" class="p-7 rounded-[2.5rem] bg-emerald-950/20 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(34,197,94,0.25)] transition-all duration-300 space-y-5 animate-fadeIn">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold font-display text-emerald-400 flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs">✓</span>
                  <span>What Worked</span>
                </h3>
                <button @click="copyText(copyWhatWorked, 'worked')" type="button" class="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all">
                  {{ copiedId === 'worked' ? '✓ Copied' : 'Copy' }}
                </button>
              </div>
              <ul class="space-y-3 text-sm text-slate-300 leading-relaxed">
                <li v-for="(item, idx) in (diagnosis.what_worked || [])" :key="idx" class="flex items-start gap-3">
                  <span class="text-emerald-400 font-bold text-base leading-none mt-0.5">•</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>

            <!-- CARD 3: WHAT FAILED ✗ -->
            <div v-if="diagnosis" class="p-7 rounded-[2.5rem] bg-rose-950/20 backdrop-blur-xl border border-rose-500/30 hover:border-rose-500/50 hover:shadow-[0_0_35px_rgba(239,68,68,0.25)] transition-all duration-300 space-y-5 animate-fadeIn">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold font-display text-rose-400 flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-xs">✗</span>
                  <span>What Failed (Drop-Off Telemetry)</span>
                </h3>
                <button @click="copyText(copyWhatFailed, 'failed')" type="button" class="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all">
                  {{ copiedId === 'failed' ? '✓ Copied' : 'Copy' }}
                </button>
              </div>
              
              <ul class="space-y-3 text-sm text-slate-300 leading-relaxed">
                <li v-for="(item, idx) in (diagnosis.what_failed || [])" :key="idx" class="flex items-start gap-3">
                  <span class="text-rose-400 font-bold text-base leading-none mt-0.5">•</span>
                  <span>{{ item }}</span>
                </li>
                <li v-if="diagnosis.retention_drop_point && diagnosis.retention_drop_reason" class="flex items-start gap-3 text-rose-300">
                  <span class="text-rose-400 font-bold text-base leading-none mt-0.5">•</span>
                  <span><strong>Drop-Off Point ({{ diagnosis.retention_drop_point }}):</strong> {{ diagnosis.retention_drop_reason }}</span>
                </li>
              </ul>

              <div v-if="diagnosis.overall_diagnosis" class="pt-4 border-t border-rose-500/20 text-xs text-rose-200/90 leading-relaxed bg-rose-950/30 p-4 rounded-2xl border border-rose-500/30">
                <span class="font-bold uppercase text-[10px] tracking-wider block mb-1 text-rose-400">Overall AI Diagnosis:</span>
                {{ diagnosis.overall_diagnosis }}
              </div>
            </div>

            <!-- CARD 4: YOUR NEXT POST STRATEGY → -->
            <div v-if="strategy" class="p-7 rounded-[2.5rem] bg-blue-950/20 backdrop-blur-xl border border-blue-500/30 hover:border-blue-500/50 hover:shadow-[0_0_35px_rgba(59,130,246,0.25)] transition-all duration-300 space-y-5 animate-fadeIn">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold font-display text-blue-400 flex items-center gap-2">
                  <span class="text-xl">→</span>
                  <span>Your Next Post Strategy</span>
                </h3>
                <button @click="copyText(copyStrategy, 'strategy')" type="button" class="px-3.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all">
                  {{ copiedId === 'strategy' ? '✓ Copied' : 'Copy' }}
                </button>
              </div>

              <div class="space-y-3 text-sm text-slate-300 divide-y divide-blue-500/10">
                <div v-if="strategy.priority_fix" class="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span class="text-xs font-mono uppercase font-bold text-blue-400 sm:w-1/3 shrink-0">Priority Fix</span>
                  <span class="text-sm text-slate-200 font-medium sm:w-2/3">{{ strategy.priority_fix }}</span>
                </div>
                <div v-if="strategy.next_content_type" class="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span class="text-xs font-mono uppercase font-bold text-blue-400 sm:w-1/3 shrink-0">Content Type</span>
                  <span class="text-sm text-slate-200 sm:w-2/3">{{ strategy.next_content_type }} &middot; {{ strategy.next_content_angle }}</span>
                </div>
                <div v-if="strategy.hook_direction" class="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span class="text-xs font-mono uppercase font-bold text-blue-400 sm:w-1/3 shrink-0">Hook Direction</span>
                  <span class="text-sm text-slate-200 sm:w-2/3">{{ strategy.hook_direction }}</span>
                </div>
                <div v-if="strategy.trend_insight" class="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span class="text-xs font-mono uppercase font-bold text-emerald-400 sm:w-1/3 shrink-0">📈 Trend Insight</span>
                  <span class="text-sm text-slate-200 sm:w-2/3">{{ strategy.trend_insight }}</span>
                </div>
                <div v-if="strategy.competitor_gap" class="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span class="text-xs font-mono uppercase font-bold text-blue-400 sm:w-1/3 shrink-0">Competitor Gap</span>
                  <span class="text-sm text-slate-200 sm:w-2/3">{{ strategy.competitor_gap }}</span>
                </div>
                <div v-if="strategy.best_time_to_post" class="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span class="text-xs font-mono uppercase font-bold text-blue-400 sm:w-1/3 shrink-0">Best Time to Post</span>
                  <span class="text-sm text-slate-200 sm:w-2/3 font-mono">{{ strategy.best_time_to_post }}</span>
                </div>
                <div v-if="strategy.estimated_impact" class="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span class="text-xs font-mono uppercase font-bold text-indigo-400 sm:w-1/3 shrink-0">Expected Impact</span>
                  <span class="text-sm text-indigo-300 font-bold sm:w-2/3">{{ strategy.estimated_impact }}</span>
                </div>
                <div v-if="strategy.strategic_reasoning" class="pt-3">
                  <span class="block text-xs font-mono uppercase font-bold text-slate-400 mb-1">Strategic Reasoning:</span>
                  <p class="text-xs text-slate-300 leading-relaxed bg-blue-950/40 p-3.5 rounded-xl border border-blue-500/20">{{ strategy.strategic_reasoning }}</p>
                </div>
              </div>
            </div>

            <!-- CARD 5: READY-TO-RECORD SCRIPT ✎ -->
            <div v-if="script" class="p-7 rounded-[2.5rem] bg-purple-950/20 backdrop-blur-xl border border-purple-500/30 hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] transition-all duration-300 space-y-6 animate-fadeIn">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold font-display text-purple-400 flex items-center gap-2">
                  <span>✎ Ready-to-Record Script</span>
                </h3>
                <button @click="copyText(copyScript, 'script')" type="button" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] text-xs font-bold uppercase tracking-wider transition-all">
                  {{ copiedId === 'script' ? '✓ Copied Script!' : 'Copy Full Script' }}
                </button>
              </div>

              <!-- Script Body Sections -->
              <div class="space-y-4">
                <div v-if="script.hook" class="p-4 rounded-2xl bg-purple-950/50 border border-purple-500/40 shadow-inner">
                  <div class="text-[10px] font-mono font-extrabold text-purple-300 uppercase tracking-widest mb-1.5">HOOK &middot; 0:00–0:03</div>
                  <div class="text-sm font-medium text-white leading-relaxed whitespace-pre-wrap">{{ script.hook }}</div>
                </div>

                <div v-if="script.body" class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">BODY &middot; 0:03–0:25</div>
                  <div class="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{{ script.body }}</div>
                </div>

                <div v-if="script.cta" class="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30">
                  <div class="text-[10px] font-mono font-extrabold text-purple-400 uppercase tracking-widest mb-1.5">CALL TO ACTION &middot; 0:25–0:32</div>
                  <div class="text-sm font-semibold text-white leading-relaxed whitespace-pre-wrap">{{ script.cta }}</div>
                </div>

                <div v-if="script.text_overlays && script.text_overlays.length" class="p-4 rounded-2xl bg-[#070a14] border border-slate-800">
                  <div class="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest mb-2">DYNAMIC TEXT OVERLAYS</div>
                  <ol class="list-decimal list-inside text-xs text-slate-300 space-y-1 font-mono">
                    <li v-for="(ov, idx) in script.text_overlays" :key="idx">{{ ov }}</li>
                  </ol>
                </div>

                <div v-if="script.b_roll_suggestions && script.b_roll_suggestions.length" class="p-4 rounded-2xl bg-[#070a14] border border-slate-800">
                  <div class="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest mb-2">B-ROLL SHOTS & VISUAL INSTRUCTIONS</div>
                  <ol class="list-decimal list-inside text-xs text-slate-300 space-y-1.5">
                    <li v-for="(broll, idx) in script.b_roll_suggestions" :key="idx">{{ broll }}</li>
                  </ol>
                </div>

                <div v-if="script.delivery_notes" class="p-3.5 rounded-xl bg-purple-900/20 border border-purple-500/20 text-xs text-purple-200 flex items-center justify-between">
                  <span><strong>Delivery Notes:</strong> {{ script.delivery_notes }}</span>
                  <span v-if="script.estimated_length" class="font-mono text-[11px] shrink-0 bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30">{{ script.estimated_length }}</span>
                </div>
              </div>
            </div>

            <div v-if="currentState === STATES.COMPLETE" class="pt-4 text-center animate-fadeIn">
              <a 
                href="https://instagram.com/piyush._maharana" 
                target="_blank"
                class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 text-xs sm:text-sm font-bold text-indigo-400 hover:text-white transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
              >
                <span>🚀 Follow the build &middot; @piyush._maharana →</span>
              </a>
            </div>

          </div>
        </div>

      </div>
    </main>
  </div>
</template>