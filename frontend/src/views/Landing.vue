<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import {
  ArrowRight,
  ArrowDown,
  Check,
  Copy,
  X,
  Menu
} from 'lucide-vue-next'

gsap.registerPlugin(ScrollTrigger)

const router = useRouter()
const authStore = useAuthStore()

// ─── Navigation & Surface Theme State ───
const navIsDaylight = ref(false)
const navScrolled = ref(false)
const mobileMenuOpen = ref(false)

const primaryCtaLabel = computed(() =>
  authStore.isAuthenticated ? 'Open Workspace' : 'Start Free'
)
const primaryCtaRoute = computed(() =>
  authStore.isAuthenticated ? '/dashboard' : '/login'
)

// ─── Refs for Canvas, Scroll Pinning & Sections ───
const heroSectionRef = ref(null)
const beamCanvasRef = ref(null)
const pipelineWrapperRef = ref(null)
const daylightZoneRef = ref(null)
const footerSectionRef = ref(null)

// ─── Scroll-Scrubbed Pipeline Active Stage (0 = Ingest, 1 = Extract, 2 = Remember) ───
const activeStage = ref(0)
const pipelineProgress = ref(0)

const pipelineStages = [
  {
    index: '01',
    key: 'INGEST',
    title: 'Ingest your real catalogue.',
    description:
      'Connect Instagram via Meta Graph. Klarix pulls your Reels, carousels, reach, saves, and shares into one structured timeline.'
  },
  {
    index: '02',
    key: 'EXTRACT',
    title: 'Isolate empirical proof.',
    description:
      'Every post is audited against your own account baseline—separating repeatable hook and framing mechanics from random spikes.'
  },
  {
    index: '03',
    key: 'REMEMBER',
    title: 'Lock into Brand Memory.',
    description:
      'Approve winning signals into a permanent Brand Constitution so every future script starts from verified truth, never a blank prompt.'
  }
]

// ─── Real Monochrome Editorial Proof Posts (from public/landing/) ───
const proofPosts = [
  {
    id: 'POST_014',
    image: '/landing/post-proof-01.webp',
    format: 'REEL',
    duration: '0:42',
    title: 'Direct-to-camera cold open under 2.5s',
    reach: '48.2K',
    rate: '8.9%',
    delta: '+41.2%',
    isWinner: true,
    tag: 'HOOK VERIFIED'
  },
  {
    id: 'POST_019',
    image: '/landing/post-proof-02.webp',
    format: 'REEL',
    duration: '0:31',
    title: 'High-contrast silhouette visual anchor',
    reach: '34.6K',
    rate: '7.4%',
    delta: '+28.6%',
    isWinner: true,
    tag: 'FRAMING LIFT'
  },
  {
    id: 'POST_023',
    image: '/landing/post-proof-03.webp',
    format: 'CAROUSEL',
    duration: '7 SLIDES',
    title: 'Tactile desk breakdown & saveable checklist',
    reach: '11.4K',
    rate: '3.1%',
    delta: '-12.4%',
    isWinner: false,
    tag: 'BELOW BASELINE'
  }
]

// ─── Interactive Daylight Workspace Preview Tabs ───
const activeWorkspaceTab = ref('patterns')
const copiedScript = ref(false)

const workspaceTabs = [
  { id: 'patterns', code: '01', label: 'Patterns' },
  { id: 'memory', code: '02', label: 'Brand Memory' },
  { id: 'script', code: '03', label: 'Production Script' }
]

const memoryRules = [
  {
    domain: 'HOOK',
    rule: 'Open directly with a concrete result or contrarian tension within the first 2.5 seconds—zero throat-clearing intros.',
    evidence: 'Verified across 14 Reels',
    confidence: 92
  },
  {
    domain: 'VISUAL',
    rule: 'Anchor talking-head authority frames in high-contrast directional light with tight eye-level framing.',
    evidence: 'Verified across 9 Reels',
    confidence: 88
  },
  {
    domain: 'VOICE',
    rule: 'Write in crisp peer-level candor; eliminate hype adjectives, exclamation chains, and generic agency filler.',
    evidence: 'Brand Constitution Locked',
    confidence: 96
  },
  {
    domain: 'AVOID',
    rule: 'Deprioritize multi-slide static summaries without an explicit opening hook—consistently -12% below baseline saves.',
    evidence: 'Verified across 11 Posts',
    confidence: 84
  }
]

const sampleScriptMarkdown = `# Production Script — Why Your Best Hook Still Lost 60% of Viewers

**Format:** Direct-to-Camera Reel | **Est. Duration:** 42s | **Voice Check:** MATCHED

## 01 / HOOK (0:00 – 0:03)
"Your last Reel didn't flop because of the algorithm. You spent four seconds saying hello."

## 02 / OPENING (0:03 – 0:11)
Pull straight into the retention drop curve from your own last 14 posts—contrast the 2.5s cold open against the slow intro.

## 03 / BODY (0:11 – 0:34)
1. Show the side-by-side baseline comparison (+41.2% interaction lift on cold opens).
2. Break down the exact 1-sentence visual + verbal tension formula locked in Brand Memory.
3. Give the viewer the exact 3-word edit check before exporting.

## 04 / CTA (0:34 – 0:42)
"Audit your last five intros before you film tomorrow—comment 'BASELINE' if you want the exact checklist."

## VISUAL DIRECTION
Tight eye-level medium shot, single directional side key light, clean concrete backdrop. Cut immediately on the first breath with zero intro fade.`

async function copySampleScript() {
  try {
    await navigator.clipboard.writeText(sampleScriptMarkdown)
    copiedScript.value = true
    setTimeout(() => {
      copiedScript.value = false
    }, 2200)
  } catch {
    copiedScript.value = false
  }
}

// ─── Proof vs. Guesswork Comparison Matrix ───
const comparisonRows = [
  {
    dimension: 'Data Source',
    generic: 'Blank prompt box & generic trends',
    klarix: 'Your live Meta Graph post & metric history'
  },
  {
    dimension: 'Memory',
    generic: 'Forgets your brand voice every session',
    klarix: 'Governed Brand Memory locked from real proof'
  },
  {
    dimension: 'Diagnosis',
    generic: 'Vague praise and surface-level tips',
    klarix: 'Visual, content & baseline performance cohorts'
  },
  {
    dimension: 'Governance',
    generic: 'Black-box suggestions with zero citations',
    klarix: 'You approve or revoke every rule with evidence'
  },
  {
    dimension: 'Deliverable',
    generic: 'Robotic copy you rewrite from scratch',
    klarix: 'Shot-ready scripts with visual direction & voice check'
  }
]

// ─── Lenis & GSAP Handles ───
let lenisInstance = null
let gsapTickerFn = null
let gsapCtx = null
let canvasAnimId = null
let resizeObserver = null

function scrollToSection(selector) {
  mobileMenuOpen.value = false
  const target = document.querySelector(selector)
  if (!target) return
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { offset: -64, duration: 1.1 })
  } else {
    target.scrollIntoView({ behavior: 'smooth' })
  }
}

function goToPrimary() {
  mobileMenuOpen.value = false
  router.push(primaryCtaRoute.value)
}

// ─── Real-Time Cursor-Following "Clarity Beam" Engine (<canvas>) ───
function initClarityBeam() {
  const canvas = beamCanvasRef.value
  const section = heroSectionRef.value
  if (!canvas || !section) return () => {}

  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let width = 0
  let height = 0
  let dpr = 1

  // Hidden Klarix telemetry proof nodes illuminated strictly where the optical beam strikes
  const signalNodes = [
    { rx: 0.78, ry: 0.24, code: 'SIG_01', label: 'HOOK RETAINED · 0:02.4', metric: '+41.2%' },
    { rx: 0.64, ry: 0.44, code: 'SIG_02', label: 'SAVE VELOCITY VS BASELINE', metric: '2.4x' },
    { rx: 0.84, ry: 0.62, code: 'SIG_03', label: 'PATTERN COHORT VERIFIED', metric: '92% CONF' },
    { rx: 0.56, ry: 0.76, code: 'SIG_04', label: 'BRAND MEMORY LOCKED', metric: 'ACTIVE' },
    { rx: 0.16, ry: 0.22, code: 'SIG_00', label: 'META GRAPH INGEST', metric: 'SYNCED' },
    { rx: 0.28, ry: 0.82, code: 'SIG_05', label: 'SCRIPT VOICE CHECK', metric: 'MATCHED' }
  ]

  // Beam origin (machined optical aperture anchored at upper-right studio ceiling)
  const pointer = {
    tx: 0.68,
    ty: 0.46,
    cx: 0.68,
    cy: 0.46,
    active: false,
    lastMove: 0
  }

  function resize() {
    const rect = section.getBoundingClientRect()
    width = rect.width
    height = rect.height
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function onPointerMove(e) {
    const rect = section.getBoundingClientRect()
    pointer.tx = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width))
    pointer.ty = Math.max(0.08, Math.min(0.92, (e.clientY - rect.top) / rect.height))
    pointer.active = true
    pointer.lastMove = performance.now()
  }

  function onPointerLeave() {
    pointer.active = false
  }

  section.addEventListener('pointermove', onPointerMove, { passive: true })
  section.addEventListener('pointerleave', onPointerLeave, { passive: true })

  resize()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(section)

  function renderFrame(now) {
    ctx.clearRect(0, 0, width, height)

    // Gentle autonomous optical sweep on mobile or idle desktop
    const idleFor = now - pointer.lastMove
    if (!reducedMotion && (!pointer.active || idleFor > 4200)) {
      const t = now * 0.00042
      pointer.tx = 0.66 + Math.cos(t) * 0.16
      pointer.ty = 0.48 + Math.sin(t * 1.3) * 0.18
    }

    // Precision mechanical spring interpolation (smooth, zero jitter)
    const ease = reducedMotion ? 1 : 0.085
    pointer.cx += (pointer.tx - pointer.cx) * ease
    pointer.cy += (pointer.ty - pointer.cy) * ease

    // Optical source sits cleanly at top-right studio edge
    const originX = width * 0.88
    const originY = -height * 0.06
    const targetX = pointer.cx * width
    const targetY = pointer.cy * height

    const dx = targetX - originX
    const dy = targetY - originY
    const angle = Math.atan2(dy, dx)
    const beamLength = Math.hypot(width, height) * 1.25
    const spreadRad = width < 768 ? 0.24 : 0.175

    // 1. Subtle architectural baseline ticks (quiet until illuminated)
    const stepX = width < 768 ? 72 : 120
    const stepY = width < 768 ? 72 : 120
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = stepX; x < width; x += stepX) {
      for (let y = stepY; y < height; y += stepY) {
        ctx.moveTo(x - 3, y)
        ctx.lineTo(x + 3, y)
        ctx.moveTo(x, y - 3)
        ctx.lineTo(x, y + 3)
      }
    }
    ctx.stroke()

    // 2. Directional Studio Light Cone (soft outer penumbra + crisp inner optical shaft)
    const coneLeftX = originX + Math.cos(angle - spreadRad) * beamLength
    const coneLeftY = originY + Math.sin(angle - spreadRad) * beamLength
    const coneRightX = originX + Math.cos(angle + spreadRad) * beamLength
    const coneRightY = originY + Math.sin(angle + spreadRad) * beamLength

    const outerGrad = ctx.createRadialGradient(
      originX,
      originY,
      10,
      originX,
      originY,
      Math.max(width, height) * 0.98
    )
    outerGrad.addColorStop(0, 'rgba(203, 255, 0, 0.22)')
    outerGrad.addColorStop(0.28, 'rgba(250, 250, 250, 0.09)')
    outerGrad.addColorStop(0.68, 'rgba(203, 255, 0, 0.03)')
    outerGrad.addColorStop(1, 'rgba(5, 5, 5, 0)')

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(originX, originY)
    ctx.lineTo(coneLeftX, coneLeftY)
    ctx.lineTo(coneRightX, coneRightY)
    ctx.closePath()
    ctx.fillStyle = outerGrad
    ctx.fill()

    // Inner tight clarity shaft
    const innerSpread = spreadRad * 0.42
    const innerGrad = ctx.createRadialGradient(
      originX,
      originY,
      0,
      originX,
      originY,
      Math.max(width, height) * 0.85
    )
    innerGrad.addColorStop(0, 'rgba(250, 250, 250, 0.2)')
    innerGrad.addColorStop(0.35, 'rgba(203, 255, 0, 0.085)')
    innerGrad.addColorStop(1, 'rgba(5, 5, 5, 0)')

    ctx.beginPath()
    ctx.moveTo(originX, originY)
    ctx.lineTo(
      originX + Math.cos(angle - innerSpread) * beamLength,
      originY + Math.sin(angle - innerSpread) * beamLength
    )
    ctx.lineTo(
      originX + Math.cos(angle + innerSpread) * beamLength,
      originY + Math.sin(angle + innerSpread) * beamLength
    )
    ctx.closePath()
    ctx.fillStyle = innerGrad
    ctx.fill()
    ctx.restore()

    // 3. Focused optical pool right at the cursor target
    const poolRadius = width < 768 ? 140 : 210
    const poolGrad = ctx.createRadialGradient(
      targetX,
      targetY,
      4,
      targetX,
      targetY,
      poolRadius
    )
    poolGrad.addColorStop(0, 'rgba(203, 255, 0, 0.14)')
    poolGrad.addColorStop(0.45, 'rgba(250, 250, 250, 0.04)')
    poolGrad.addColorStop(1, 'rgba(5, 5, 5, 0)')
    ctx.fillStyle = poolGrad
    ctx.beginPath()
    ctx.arc(targetX, targetY, poolRadius, 0, Math.PI * 2)
    ctx.fill()

    // 4. Precision hairline targeting reticle along the beam axis
    ctx.strokeStyle = 'rgba(203, 255, 0, 0.16)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(originX, originY)
    ctx.lineTo(targetX, targetY)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(203, 255, 0, 0.55)'
    ctx.beginPath()
    ctx.moveTo(targetX - 7, targetY)
    ctx.lineTo(targetX + 7, targetY)
    ctx.moveTo(targetX, targetY - 7)
    ctx.lineTo(targetX, targetY + 7)
    ctx.stroke()

    // 5. Reveal Klarix proof telemetry nodes dynamically based on beam angular + proximity hit
    if (width >= 640) {
      for (const node of signalNodes) {
        const nx = node.rx * width
        const ny = node.ry * height
        const nodeAngle = Math.atan2(ny - originY, nx - originX)
        let angleDiff = Math.abs(nodeAngle - angle)
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff

        const distToTarget = Math.hypot(nx - targetX, ny - targetY)
        const inCone = Math.max(0, 1 - angleDiff / (spreadRad * 1.15))
        const nearCursor = Math.max(0, 1 - distToTarget / 260)
        const intensity = Math.min(1, Math.max(inCone * 0.85, nearCursor))

        // Quiet dormant marker when outside the light cone
        const baseAlpha = 0.08 + intensity * 0.88

        ctx.save()
        ctx.translate(nx, ny)

        // Sharp 6x6 instrument square
        ctx.fillStyle =
          intensity > 0.35
            ? `rgba(203, 255, 0, ${baseAlpha})`
            : `rgba(255, 255, 255, ${baseAlpha * 0.6})`
        ctx.fillRect(-3, -3, 6, 6)

        // Reveal crisp proof telemetry text only when illuminated
        if (intensity > 0.16) {
          ctx.font = '600 10px "Geist Mono", monospace'
          ctx.fillStyle = `rgba(250, 250, 250, ${Math.min(0.95, intensity * 0.95)})`
          ctx.fillText(`${node.code} // ${node.label}`, 12, -2)

          ctx.font = '700 11px "Geist Mono", monospace'
          ctx.fillStyle = `rgba(203, 255, 0, ${Math.min(1, intensity)})`
          ctx.fillText(node.metric, 12, 12)
        }

        ctx.restore()
      }
    }

    if (!reducedMotion) {
      canvasAnimId = requestAnimationFrame(renderFrame)
    }
  }

  canvasAnimId = requestAnimationFrame(renderFrame)

  return () => {
    if (canvasAnimId) cancelAnimationFrame(canvasAnimId)
    section.removeEventListener('pointermove', onPointerMove)
    section.removeEventListener('pointerleave', onPointerLeave)
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }
}

let cleanupBeam = null

onMounted(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 1. Mount real-time cursor-following optical beam
  cleanupBeam = initClarityBeam()

  // 2. Initialize Lenis smooth scroll synced cleanly with GSAP ScrollTrigger
  if (!reducedMotion) {
    lenisInstance = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    })

    lenisInstance.on('scroll', () => {
      ScrollTrigger.update()
      navScrolled.value = window.scrollY > 24
    })

    gsapTickerFn = (time) => {
      lenisInstance?.raf(time * 1000)
    }
    gsap.ticker.add(gsapTickerFn)
    gsap.ticker.lagSmoothing(0)
  }

  // 3. GSAP ScrollTrigger animations (scoped via gsap.context for clean unmount)
  gsapCtx = gsap.context(() => {
    // Switch navbar from Obsidian to Daylight seamlessly across light bands
    if (daylightZoneRef.value) {
      ScrollTrigger.create({
        trigger: daylightZoneRef.value,
        start: 'top 64px',
        end: 'bottom 64px',
        onEnter: () => (navIsDaylight.value = true),
        onLeave: () => (navIsDaylight.value = false),
        onEnterBack: () => (navIsDaylight.value = true),
        onLeaveBack: () => (navIsDaylight.value = false)
      })
    }

    // Desktop-only pinned scroll-scrubbed 3-stage pipeline (forward + reverse)
    const mm = gsap.matchMedia()
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      if (!pipelineWrapperRef.value) return

      ScrollTrigger.create({
        trigger: pipelineWrapperRef.value,
        start: 'top top',
        end: '+=220%',
        pin: true,
        scrub: 0.5,
        anticipatePin: 1,
        onUpdate: (self) => {
          pipelineProgress.value = self.progress
          if (self.progress < 0.34) {
            activeStage.value = 0
          } else if (self.progress < 0.68) {
            activeStage.value = 1
          } else {
            activeStage.value = 2
          }
        }
      })
    })
  })
})

onUnmounted(() => {
  if (cleanupBeam) cleanupBeam()
  if (gsapCtx) gsapCtx.revert()
  if (gsapTickerFn) gsap.ticker.remove(gsapTickerFn)
  if (lenisInstance) {
    lenisInstance.destroy()
    lenisInstance = null
  }
})
</script>

<template>
  <div class="min-h-screen bg-obsidian text-obsidian-ink selection:bg-volt selection:text-ink">
    <!-- ===================================================================
         FIXED ARCHITECTURAL NAV BAR (Adapts Obsidian <-> Daylight cleanly)
         =================================================================== -->
    <header
      class="fixed top-0 left-0 right-0 z-50 h-16 transition-colors duration-200 border-b"
      :class="[
        navIsDaylight
          ? 'bg-surface/92 text-ink border-border-hairline backdrop-blur-md'
          : navScrolled
            ? 'bg-obsidian/90 text-obsidian-ink border-obsidian-border backdrop-blur-md'
            : 'bg-transparent text-obsidian-ink border-transparent'
      ]"
    >
      <div class="max-w-7xl mx-auto h-full px-5 sm:px-8 flex items-center justify-between">
        <!-- Brand Lockup -->
        <a
          href="#top"
          @click.prevent="scrollToSection('#top')"
          class="flex items-center gap-3 group"
        >
          <img
            src="/brand/logo-volt.svg"
            alt="Klarix"
            class="w-7 h-7 rounded-[2px] border"
            :class="navIsDaylight ? 'border-ink' : 'border-volt'"
          />
          <span class="font-display font-extrabold text-xl tracking-tight leading-none">
            KLARIX
          </span>
          <span
            class="hidden md:inline-block h-4 w-px"
            :class="navIsDaylight ? 'bg-border-hairline' : 'bg-obsidian-border'"
          ></span>
          <span
            class="hidden md:inline-block klx-mono-label"
            :class="navIsDaylight ? 'text-ink-muted' : 'text-obsidian-muted'"
          >
            Content Intelligence
          </span>
        </a>

        <!-- Center Navigation Links -->
        <nav class="hidden md:flex items-center gap-8 text-sm font-medium">
          <button
            type="button"
            @click="scrollToSection('#pipeline')"
            class="cursor-pointer transition-colors"
            :class="
              navIsDaylight
                ? 'text-ink-secondary hover:text-ink'
                : 'text-obsidian-muted hover:text-obsidian-ink'
            "
          >
            Pipeline
          </button>
          <button
            type="button"
            @click="scrollToSection('#workspace')"
            class="cursor-pointer transition-colors"
            :class="
              navIsDaylight
                ? 'text-ink-secondary hover:text-ink'
                : 'text-obsidian-muted hover:text-obsidian-ink'
            "
          >
            Workspace
          </button>
          <button
            type="button"
            @click="scrollToSection('#why-klarix')"
            class="cursor-pointer transition-colors"
            :class="
              navIsDaylight
                ? 'text-ink-secondary hover:text-ink'
                : 'text-obsidian-muted hover:text-obsidian-ink'
            "
          >
            Why Klarix
          </button>
        </nav>

        <!-- Right Auth / Workspace Actions -->
        <div class="hidden md:flex items-center gap-5">
          <router-link
            v-if="!authStore.isAuthenticated"
            to="/login"
            class="text-sm font-medium transition-colors"
            :class="
              navIsDaylight
                ? 'text-ink-secondary hover:text-ink'
                : 'text-obsidian-muted hover:text-obsidian-ink'
            "
          >
            Sign In
          </router-link>

          <button
            type="button"
            @click="goToPrimary"
            class="klx-btn-volt px-4 py-2 text-xs uppercase tracking-wider font-mono"
            :class="!navIsDaylight ? '!shadow-none !border-volt' : ''"
          >
            <span>{{ primaryCtaLabel }}</span>
            <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
          </button>
        </div>

        <!-- Mobile Menu Button -->
        <button
          type="button"
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="md:hidden p-2 border rounded-[2px]"
          :class="
            navIsDaylight
              ? 'border-border-hairline text-ink'
              : 'border-obsidian-border text-obsidian-ink'
          "
          aria-label="Toggle menu"
        >
          <X v-if="mobileMenuOpen" class="w-5 h-5" :stroke-width="1.75" />
          <Menu v-else class="w-5 h-5" :stroke-width="1.75" />
        </button>
      </div>

      <!-- Mobile Drawer -->
      <div
        v-if="mobileMenuOpen"
        class="md:hidden border-b px-5 py-6 space-y-4"
        :class="
          navIsDaylight
            ? 'bg-surface text-ink border-border-hairline'
            : 'bg-obsidian text-obsidian-ink border-obsidian-border'
        "
      >
        <div class="flex flex-col gap-3 text-sm font-medium">
          <button type="button" @click="scrollToSection('#pipeline')" class="text-left py-1">
            Pipeline
          </button>
          <button type="button" @click="scrollToSection('#workspace')" class="text-left py-1">
            Workspace
          </button>
          <button type="button" @click="scrollToSection('#why-klarix')" class="text-left py-1">
            Why Klarix
          </button>
        </div>
        <div class="pt-4 border-t border-current/15 flex flex-col gap-3">
          <router-link
            v-if="!authStore.isAuthenticated"
            to="/login"
            @click="mobileMenuOpen = false"
            class="text-sm font-medium py-1"
          >
            Sign In
          </router-link>
          <button
            type="button"
            @click="goToPrimary"
            class="klx-btn-volt w-full py-3 text-xs uppercase tracking-wider font-mono !shadow-none"
          >
            <span>{{ primaryCtaLabel }}</span>
            <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
          </button>
        </div>
      </div>
    </header>

    <!-- ===================================================================
         01. OBSIDIAN HERO WITH REAL-TIME CURSOR-FOLLOWING CLARITY BEAM
         =================================================================== -->
    <section
      id="top"
      ref="heroSectionRef"
      class="theme-obsidian relative min-h-screen flex flex-col justify-between overflow-hidden pt-24 pb-8 border-b border-obsidian-border"
    >
      <!-- Interactive Optical Beam Canvas (Native 4K DPR) -->
      <canvas
        ref="beamCanvasRef"
        class="absolute inset-0 w-full h-full pointer-events-none z-0"
        aria-hidden="true"
      ></canvas>

      <!-- Main Editorial Hero Content -->
      <div class="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 my-auto py-12 sm:py-16">
        <div class="max-w-4xl">
          <!-- Kicker -->
          <div class="inline-flex items-center gap-2.5 mb-7 px-3 py-1.5 bg-obsidian-surface border border-obsidian-border rounded-[2px]">
            <span class="klx-pulse-square"></span>
            <span class="klx-mono-label text-obsidian-ink">Content Intelligence</span>
          </div>

          <!-- Locked Hero H1 -->
          <h1
            class="font-display font-extrabold text-obsidian-ink tracking-[-0.04em] leading-[0.95] text-[clamp(2.85rem,6.6vw,6.1rem)]"
          >
            Build your next post on your own
            <span class="text-volt">proof.</span>
          </h1>

          <!-- Locked Hero Subhead -->
          <p
            class="mt-7 max-w-xl text-base sm:text-lg leading-relaxed text-obsidian-muted font-sans"
          >
            Connect your account. Klarix extracts proven patterns from your posts, locks them into
            your Brand Memory, and scripts what to shoot next.
          </p>

          <!-- Primary CTA Row -->
          <div class="mt-9 flex flex-wrap items-center gap-4">
            <button
              type="button"
              @click="goToPrimary"
              class="klx-btn-volt px-6 py-3.5 text-sm font-semibold"
            >
              <span>{{ primaryCtaLabel }}</span>
              <ArrowRight class="w-4 h-4" :stroke-width="2" />
            </button>

            <button
              type="button"
              @click="scrollToSection('#pipeline')"
              class="klx-btn-outline px-5 py-3.5 text-sm text-obsidian-ink border-obsidian-border hover:border-obsidian-ink"
            >
              <span>Inspect the Pipeline</span>
              <ArrowDown class="w-4 h-4" :stroke-width="1.75" />
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Telemetry Strip -->
      <div class="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 pt-6 border-t border-obsidian-border/80">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 klx-mono-label text-obsidian-muted">
          <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>01 Meta Graph Sync</span>
            <span class="text-obsidian-border">/</span>
            <span>02 Evidence-Linked Patterns</span>
            <span class="text-obsidian-border">/</span>
            <span>03 Governed Brand Memory</span>
          </div>
          <div class="text-obsidian-ink">Clarity that remembers.</div>
        </div>
      </div>
    </section>

    <!-- ===================================================================
         02. SCROLL-SCRUBBED PIPELINE (01 INGEST -> 02 EXTRACT -> 03 REMEMBER)
         Pinned on desktop via GSAP ScrollTrigger; clean stacked flow on mobile
         =================================================================== -->
    <section
      id="pipeline"
      ref="pipelineWrapperRef"
      class="theme-obsidian relative min-h-screen flex items-center py-20 lg:py-0 border-b border-obsidian-border"
    >
      <div class="max-w-7xl w-full mx-auto px-5 sm:px-8">
        <!-- Section Header & Mechanical Progress Bar -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 lg:mb-12">
          <div>
            <p class="klx-mono-label text-volt mb-3">01 / Intelligence Pipeline</p>
            <h2 class="font-display font-bold text-3xl sm:text-5xl tracking-[-0.03em] leading-[1.02]">
              From raw posts to permanent memory.
            </h2>
          </div>

          <!-- Mechanical Progress Readout (Desktop Scroll Sync) -->
          <div class="hidden lg:flex flex-col items-end gap-2 min-w-[220px]">
            <div class="w-full flex items-center justify-between klx-mono-label text-obsidian-muted">
              <span>STAGE {{ pipelineStages[activeStage].index }} / 03</span>
              <span class="text-volt">{{ pipelineStages[activeStage].key }}</span>
            </div>
            <div class="w-full h-1 bg-obsidian-border overflow-hidden">
              <div
                class="h-full bg-volt transition-all duration-100"
                :style="{ width: `${Math.max(8, Math.round(pipelineProgress * 100))}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 12-Column Split: Left Stage Ledger | Right Live Documentary Proof Canvas -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <!-- Left: 3 Pipeline Stages (Clickable on mobile/desktop + scroll-linked on desktop) -->
          <div class="lg:col-span-5 space-y-3">
            <button
              v-for="(stage, idx) in pipelineStages"
              :key="stage.key"
              type="button"
              @click="activeStage = idx"
              class="w-full text-left p-5 border rounded-[2px] transition-all duration-200 cursor-pointer"
              :class="
                activeStage === idx
                  ? 'bg-obsidian-surface border-volt'
                  : 'bg-transparent border-obsidian-border opacity-55 hover:opacity-85'
              "
            >
              <div class="flex items-center justify-between mb-2">
                <span
                  class="klx-mono-label"
                  :class="activeStage === idx ? 'text-volt' : 'text-obsidian-muted'"
                >
                  {{ stage.index }} — {{ stage.key }}
                </span>
                <span
                  v-if="activeStage === idx"
                  class="w-2 h-2 bg-volt"
                ></span>
              </div>
              <h3 class="font-display font-bold text-xl text-obsidian-ink tracking-tight">
                {{ stage.title }}
              </h3>
              <p class="mt-2 text-sm leading-relaxed text-obsidian-muted">
                {{ stage.description }}
              </p>
            </button>
          </div>

          <!-- Right: Real Monochrome Editorial Proof Cards reacting to activeStage -->
          <div class="lg:col-span-7">
            <div class="border border-obsidian-border bg-obsidian-surface rounded-[2px] p-5 sm:p-6">
              <!-- Frame Top Bar -->
              <div class="flex items-center justify-between pb-4 mb-5 border-b border-obsidian-border klx-mono-label">
                <span class="text-obsidian-muted">
                  {{
                    activeStage === 0
                      ? 'CATALOGUE INGEST // 55 POSTS SYNCED'
                      : activeStage === 1
                        ? 'COHORT AUDIT // ISOLATING WINNING SIGNALS'
                        : 'BRAND MEMORY // RULE GOVERNANCE ACTIVE'
                  }}
                </span>
                <span class="text-volt">
                  {{
                    activeStage === 0
                      ? 'META GRAPH'
                      : activeStage === 1
                        ? '+38.4% LIFT'
                        : 'LOCKED'
                  }}
                </span>
              </div>

              <!-- 3 Real Editorial Post Cards -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <article
                  v-for="post in proofPosts"
                  :key="post.id"
                  class="border rounded-[2px] overflow-hidden transition-all duration-300"
                  :class="[
                    activeStage === 0
                      ? 'border-obsidian-border bg-obsidian'
                      : post.isWinner
                        ? 'border-volt bg-obsidian'
                        : 'border-obsidian-border bg-obsidian opacity-35 grayscale'
                  ]"
                >
                  <div class="relative aspect-[4/5] overflow-hidden bg-obsidian">
                    <img
                      :src="post.image"
                      :alt="post.title"
                      loading="lazy"
                      class="w-full h-full object-cover transition-transform duration-500"
                      :class="activeStage >= 1 && post.isWinner ? 'scale-[1.03]' : ''"
                    />

                    <!-- Top Sharp Tag -->
                    <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span class="klx-badge bg-obsidian/90 text-obsidian-ink border border-obsidian-border">
                        {{ post.format }}
                      </span>
                      <span
                        v-if="activeStage >= 1 && post.isWinner"
                        class="klx-badge bg-volt text-ink"
                      >
                        {{ post.delta }}
                      </span>
                    </div>
                  </div>

                  <div class="p-3.5 space-y-2.5">
                    <p class="text-xs font-medium text-obsidian-ink leading-snug line-clamp-2">
                      {{ post.title }}
                    </p>
                    <div class="pt-2 border-t border-obsidian-border flex items-center justify-between klx-kpi text-xs">
                      <span class="text-obsidian-muted">{{ post.reach }} reach</span>
                      <span :class="post.isWinner && activeStage >= 1 ? 'text-volt font-semibold' : 'text-obsidian-ink'">
                        {{ post.rate }}
                      </span>
                    </div>
                  </div>
                </article>
              </div>

              <!-- Stage 3 Locked Brand Memory Rule Drawer -->
              <div
                class="mt-5 p-4 border rounded-[2px] transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                :class="
                  activeStage === 2
                    ? 'border-volt bg-obsidian text-obsidian-ink'
                    : 'border-obsidian-border/70 bg-obsidian/50 text-obsidian-muted'
                "
              >
                <div class="space-y-1">
                  <div class="flex items-center gap-2 klx-mono-label">
                    <span
                      class="w-2 h-2"
                      :class="activeStage === 2 ? 'bg-volt' : 'bg-obsidian-border'"
                    ></span>
                    <span :class="activeStage === 2 ? 'text-volt' : 'text-obsidian-muted'">
                      {{
                        activeStage === 2
                          ? 'PROMOTED TO BRAND MEMORY'
                          : 'AWAITING PATTERN APPROVAL'
                      }}
                    </span>
                  </div>
                  <p class="text-sm leading-snug">
                    “Lead direct-to-camera Reels with a concrete proof statement inside 2.5 seconds;
                    pair with high-contrast directional framing.”
                  </p>
                </div>

                <span
                  class="klx-badge shrink-0"
                  :class="
                    activeStage === 2
                      ? 'bg-volt text-ink'
                      : 'border border-obsidian-border text-obsidian-muted'
                  "
                >
                  {{ activeStage === 2 ? 'RULE ACTIVE' : 'STAGED' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================================================================
         CRISP DAYLIGHT ZONE (Sections 03 & 04)
         Hard Neo-Swiss shift from Obsidian (#050505) -> Daylight (#F7F7F5)
         =================================================================== -->
    <div ref="daylightZoneRef" class="bg-canvas text-ink">
      <!-- 03. INTERACTIVE WORKSPACE PREVIEW -->
      <section id="workspace" class="py-24 sm:py-32 border-b border-border-hairline">
        <div class="max-w-7xl mx-auto px-5 sm:px-8">
          <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div class="max-w-2xl">
              <p class="klx-mono-label text-volt-ink mb-3">02 / Inside the Workspace</p>
              <h2 class="font-display font-extrabold text-3xl sm:text-5xl tracking-[-0.035em] leading-[1.02]">
                Designed like an instrument, not a chat box.
              </h2>
            </div>

            <!-- Interactive 3-Tab Switcher -->
            <div class="inline-flex border border-border-strong bg-surface rounded-[2px] p-1 self-start">
              <button
                v-for="tab in workspaceTabs"
                :key="tab.id"
                type="button"
                @click="activeWorkspaceTab = tab.id"
                class="px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider rounded-[2px] transition-colors cursor-pointer"
                :class="
                  activeWorkspaceTab === tab.id
                    ? 'bg-ink text-surface'
                    : 'text-ink-secondary hover:text-ink'
                "
              >
                <span class="opacity-60 mr-1.5">{{ tab.code }}</span>{{ tab.label }}
              </button>
            </div>
          </div>

          <!-- Machined Daylight App Preview Window -->
          <div class="klx-card overflow-hidden">
            <!-- Mock Workspace Utility Bar -->
            <div class="px-5 py-3.5 bg-surface border-b border-border-hairline flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <img src="/brand/logo-volt.svg" alt="" class="w-5 h-5 rounded-[2px] border border-ink" />
                <span class="font-display font-bold text-sm tracking-tight">KLARIX WORKSPACE</span>
                <span class="text-border-hairline">/</span>
                <span class="klx-mono-label text-ink-muted">
                  {{
                    activeWorkspaceTab === 'patterns'
                      ? 'Patterns · Cohort Evidence'
                      : activeWorkspaceTab === 'memory'
                        ? 'Brand Memory · Active Constitution'
                        : 'Strategy · Production Script'
                  }}
                </span>
              </div>

              <div class="flex items-center gap-2 klx-mono-label text-ink-muted">
                <span class="w-2 h-2 bg-status-positive"></span>
                <span>55 POSTS ANALYZED</span>
              </div>
            </div>

            <!-- TAB 1: PATTERNS -->
            <div v-if="activeWorkspaceTab === 'patterns'" class="p-6 sm:p-8 bg-canvas">
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Left Pattern Evidence Summary -->
                <div class="lg:col-span-7 klx-card p-6 flex flex-col justify-between gap-6">
                  <div>
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <span class="klx-badge bg-volt text-ink border border-ink">
                        CONTENT_STRATEGY
                      </span>
                      <span class="klx-mono-label text-ink-muted">CONFIDENCE 92% · 14 POSTS</span>
                    </div>
                    <h3 class="font-display font-bold text-2xl tracking-tight text-ink">
                      Sub-2.5s Direct Cold Opens Outperform Contextual Intros
                    </h3>
                    <p class="mt-3 text-sm leading-relaxed text-ink-secondary">
                      Posts opening directly on an observable tension or hard metric without a
                      greeting retain viewers past the 3-second cliff and drive consistently higher
                      save-to-reach ratios across your catalogue.
                    </p>
                  </div>

                  <!-- Cohort Delta Telemetry Strip -->
                  <div class="grid grid-cols-3 gap-3 pt-5 border-t border-border-hairline">
                    <div class="p-3.5 bg-canvas border border-border-hairline rounded-[2px]">
                      <div class="klx-mono-label text-ink-muted">Top Cohort</div>
                      <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">8.4%</div>
                    </div>
                    <div class="p-3.5 bg-canvas border border-border-hairline rounded-[2px]">
                      <div class="klx-mono-label text-ink-muted">Baseline</div>
                      <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink-secondary">5.1%</div>
                    </div>
                    <div class="p-3.5 bg-volt-tint border border-ink rounded-[2px]">
                      <div class="klx-mono-label text-ink">Measured Lift</div>
                      <div class="mt-1.5 text-2xl font-bold klx-kpi text-ink">+64.7%</div>
                    </div>
                  </div>
                </div>

                <!-- Right Visual Supporting Proof -->
                <div class="lg:col-span-5 klx-card p-6 flex flex-col justify-between gap-5">
                  <div class="flex items-center justify-between">
                    <span class="klx-mono-label text-ink-muted">Supporting Proof Frames</span>
                    <span class="klx-mono-label text-status-positive">VERIFIED</span>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                    <div
                      v-for="post in proofPosts"
                      :key="post.id"
                      class="border rounded-[2px] overflow-hidden"
                      :class="post.isWinner ? 'border-ink' : 'border-border-hairline opacity-50'"
                    >
                      <img
                        :src="post.image"
                        :alt="post.title"
                        loading="lazy"
                        class="w-full aspect-[4/5] object-cover"
                      />
                      <div class="p-2 bg-surface text-center klx-kpi text-[11px] font-semibold">
                        {{ post.delta }}
                      </div>
                    </div>
                  </div>

                  <div class="pt-4 border-t border-border-hairline flex items-center justify-between">
                    <span class="text-xs text-ink-secondary">Ready for governance approval</span>
                    <router-link
                      :to="primaryCtaRoute"
                      class="klx-btn-volt px-3.5 py-2 text-xs font-mono uppercase tracking-wider"
                    >
                      <span>Approve Rule</span>
                      <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
                    </router-link>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: BRAND MEMORY -->
            <div v-else-if="activeWorkspaceTab === 'memory'" class="p-6 sm:p-8 bg-canvas">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="item in memoryRules"
                  :key="item.domain"
                  class="klx-card p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <span
                        class="klx-badge border"
                        :class="
                          item.domain === 'AVOID'
                            ? 'bg-status-negative-bg text-status-negative border-status-negative/30'
                            : 'bg-canvas text-ink border-border-hairline'
                        "
                      >
                        {{ item.domain }}
                      </span>
                      <span class="klx-mono-label text-ink-muted">{{ item.evidence }}</span>
                    </div>
                    <p class="text-sm font-medium leading-relaxed text-ink">
                      {{ item.rule }}
                    </p>
                  </div>

                  <div class="pt-3 border-t border-border-hairline flex items-center justify-between gap-4">
                    <div class="flex-1 h-1.5 bg-surface-subtle overflow-hidden">
                      <div
                        class="h-full bg-ink"
                        :style="{ width: `${item.confidence}%` }"
                      ></div>
                    </div>
                    <span class="klx-kpi text-xs font-semibold text-ink">
                      {{ item.confidence }}% CONF
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: PRODUCTION SCRIPT -->
            <div v-else class="p-6 sm:p-8 bg-canvas">
              <div class="klx-card p-6">
                <div class="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-border-hairline">
                  <div>
                    <div class="flex items-center gap-2.5 mb-1.5">
                      <span class="klx-badge bg-volt text-ink border border-ink">REEL SCRIPT</span>
                      <span class="klx-badge bg-status-positive-bg text-status-positive">
                        VOICE CHECK: MATCHED
                      </span>
                      <span class="klx-mono-label text-ink-muted">EST. 42 SECONDS</span>
                    </div>
                    <h3 class="font-display font-bold text-xl sm:text-2xl tracking-tight text-ink">
                      Why Your Best Hook Still Lost 60% of Viewers
                    </h3>
                  </div>

                  <button
                    type="button"
                    @click="copySampleScript"
                    class="klx-btn-outline px-4 py-2 text-xs font-mono uppercase tracking-wider"
                  >
                    <Check v-if="copiedScript" class="w-3.5 h-3.5 text-status-positive" :stroke-width="2" />
                    <Copy v-else class="w-3.5 h-3.5" :stroke-width="1.75" />
                    <span>{{ copiedScript ? 'Copied for Notion' : 'Copy Markdown' }}</span>
                  </button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div class="lg:col-span-8 space-y-4">
                    <div class="p-4 bg-canvas border-l-2 border-volt border-y border-r border-border-hairline rounded-[2px]">
                      <div class="klx-mono-label text-ink-muted mb-1.5">01 / Hook (0:00 – 0:03)</div>
                      <p class="font-display font-semibold text-lg text-ink">
                        “Your last Reel didn't flop because of the algorithm. You spent four seconds saying hello.”
                      </p>
                    </div>

                    <div class="p-4 bg-surface border border-border-hairline rounded-[2px]">
                      <div class="klx-mono-label text-ink-muted mb-1.5">02 / Opening & Body (0:03 – 0:34)</div>
                      <p class="text-sm leading-relaxed text-ink-secondary">
                        Show the retention contrast across your last 14 posts (+41.2% interaction lift on
                        direct cold opens). Walk through the 1-sentence tension formula locked in your
                        Brand Memory and end with the 3-word pre-export cut check.
                      </p>
                    </div>
                  </div>

                  <div class="lg:col-span-4 p-4 bg-canvas border border-border-hairline rounded-[2px] space-y-4">
                    <div>
                      <div class="klx-mono-label text-ink-muted mb-1.5">Visual Direction</div>
                      <p class="text-xs leading-relaxed text-ink-secondary">
                        Eye-level medium shot, single directional side light, concrete backdrop. Hard
                        cut on breath one—no fade-in or logo intro.
                      </p>
                    </div>
                    <div class="pt-3 border-t border-border-hairline">
                      <div class="klx-mono-label text-ink-muted mb-1.5">Memory Rules Applied</div>
                      <div class="flex flex-wrap gap-1.5">
                        <span class="klx-badge bg-surface border border-border-hairline text-ink">HOOK &lt; 2.5S</span>
                        <span class="klx-badge bg-surface border border-border-hairline text-ink">PEER VOICE</span>
                        <span class="klx-badge bg-surface border border-border-hairline text-ink">SIDE KEY LIGHT</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 04. PROOF VS. GUESSWORK MATRIX -->
      <section id="why-klarix" class="py-24 sm:py-32">
        <div class="max-w-7xl mx-auto px-5 sm:px-8">
          <div class="max-w-2xl mb-12">
            <p class="klx-mono-label text-volt-ink mb-3">03 / Proof vs. Guesswork</p>
            <h2 class="font-display font-extrabold text-3xl sm:text-5xl tracking-[-0.035em] leading-[1.02]">
              Why serious creators stop prompting generic AI.
            </h2>
          </div>

          <div class="border border-border-strong bg-surface rounded-[2px] overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr class="border-b border-border-strong bg-canvas">
                  <th class="py-4 px-6 klx-mono-label text-ink-muted w-1/5">Dimension</th>
                  <th class="py-4 px-6 klx-mono-label text-ink-muted w-2/5">Generic AI Tools</th>
                  <th class="py-4 px-6 klx-mono-label text-ink bg-volt w-2/5 border-l border-border-strong">
                    Klarix V2
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-hairline text-sm">
                <tr v-for="row in comparisonRows" :key="row.dimension">
                  <td class="py-5 px-6 font-mono text-xs uppercase tracking-wider text-ink-muted font-semibold">
                    {{ row.dimension }}
                  </td>
                  <td class="py-5 px-6 text-ink-secondary">
                    {{ row.generic }}
                  </td>
                  <td class="py-5 px-6 font-medium text-ink border-l border-border-hairline bg-surface">
                    <span class="inline-flex items-start gap-2.5">
                      <Check class="w-4 h-4 text-volt-ink shrink-0 mt-0.5" :stroke-width="2.25" />
                      <span>{{ row.klarix }}</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- ===================================================================
         05. FULL-BLEED MONOCHROME EDITORIAL TRANSITION BAND
         Real documentary photography with generous dark negative space
         =================================================================== -->
    <section class="theme-obsidian relative min-h-[64vh] flex items-center overflow-hidden border-t border-b border-obsidian-border">
      <img
        src="/landing/editorial-studio-band.webp"
        alt="Solo creator reviewing content footage under studio skylight"
        loading="lazy"
        class="absolute inset-0 w-full h-full object-cover object-center sm:object-right"
      />
      <div
        class="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/80 to-obsidian/20"
        aria-hidden="true"
      ></div>

      <div class="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 py-24">
        <div class="max-w-xl">
          <div class="w-10 h-1 bg-volt mb-6"></div>
          <p class="font-display font-bold text-3xl sm:text-5xl tracking-[-0.03em] leading-[1.05] text-obsidian-ink">
            Stop feeding blank prompts to AI that forgets you every Tuesday.
          </p>
          <p class="mt-5 klx-mono-label text-volt">
            Clarity that remembers.
          </p>
        </div>
      </div>
    </section>

    <!-- ===================================================================
         06. FINAL CONVERSION CTA & SEMANTIC FOOTER
         =================================================================== -->
    <footer ref="footerSectionRef" class="theme-obsidian pt-24 pb-12">
      <div class="max-w-7xl mx-auto px-5 sm:px-8">
        <!-- Oversized Conversion Block -->
        <div class="pb-20 border-b border-obsidian-border flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div class="max-w-3xl">
            <p class="klx-mono-label text-obsidian-muted mb-4">04 / Initialize Workspace</p>
            <h2 class="font-display font-extrabold text-4xl sm:text-6xl tracking-[-0.04em] leading-[0.96]">
              Your past posts already contain your next breakthrough.
            </h2>
          </div>

          <button
            type="button"
            @click="goToPrimary"
            class="klx-btn-volt px-7 py-4 text-sm font-semibold shrink-0 self-start lg:self-end"
          >
            <span>{{ authStore.isAuthenticated ? 'Open Workspace' : 'Initialize Workspace' }}</span>
            <ArrowRight class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>

        <!-- Structured Footer Links -->
        <div class="pt-10 flex flex-col md:flex-row md:items-center justify-between gap-8 text-xs text-obsidian-muted">
          <div class="flex items-center gap-3">
            <img src="/brand/logo-mono-light.svg" alt="Klarix" class="w-5 h-5" />
            <span class="font-display font-bold text-sm text-obsidian-ink tracking-tight">KLARIX</span>
            <span class="text-obsidian-border">/</span>
            <span class="font-mono uppercase tracking-wider">Clarity that remembers.</span>
          </div>

          <div class="flex flex-wrap items-center gap-6 font-mono uppercase tracking-wider">
            <button type="button" @click="scrollToSection('#pipeline')" class="hover:text-obsidian-ink cursor-pointer">
              Pipeline
            </button>
            <button type="button" @click="scrollToSection('#workspace')" class="hover:text-obsidian-ink cursor-pointer">
              Workspace
            </button>
            <button type="button" @click="scrollToSection('#why-klarix')" class="hover:text-obsidian-ink cursor-pointer">
              Why Klarix
            </button>
            <router-link :to="primaryCtaRoute" class="text-volt hover:underline">
              {{ primaryCtaLabel }}
            </router-link>
          </div>

          <div class="font-mono text-obsidian-muted">
            &copy; 2026 Klarix. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>