<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let animationId = null
let angle = 0
let targetAngle = 0
let currentGlobeY = -1
let targetGlobeY = -1
let time = 0
let scrollRatio = 0

// Generate 140 twinkling space galaxy stars
const generateStars = (count = 140) => {
  const stars = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
      brightness: Math.random() * 0.5 + 0.5,
      color: Math.random() > 0.8 ? '#38BDF8' : Math.random() > 0.6 ? '#A78BFA' : '#FFFFFF'
    })
  }
  return stars
}
const stars = generateStars(160)

// Generate deterministic noise for low-poly continents
const isContinent = (x, y, z) => {
  const val = Math.sin(x * 3.2) * Math.cos(y * 2.8) + Math.sin(z * 3.5) + Math.cos(x * 1.5 + z * 1.5) * 0.5
  return val > 0.2
}

// Build low-poly sphere mesh
const buildSphereMesh = (latSteps = 20, lonSteps = 36) => {
  const faces = []
  const greenPins = []

  for (let i = 0; i < latSteps; i++) {
    const theta1 = (Math.PI / (latSteps + 1)) * (i + 1) - Math.PI / 2
    const theta2 = (Math.PI / (latSteps + 1)) * (i + 2) - Math.PI / 2
    
    for (let j = 0; j < lonSteps; j++) {
      const phi1 = (2 * Math.PI / lonSteps) * j
      const phi2 = (2 * Math.PI / lonSteps) * ((j + 1) % lonSteps)

      const getPt = (t, p) => {
        const x = Math.cos(t) * Math.cos(p)
        const y = Math.sin(t)
        const z = Math.cos(t) * Math.sin(p)
        const continent = isContinent(x, y, z)
        const r = continent ? 1.035 : 1.0
        return { x: x * r, y: y * r, z: z * r, continent }
      }

      const p1 = getPt(theta1, phi1)
      const p2 = getPt(theta1, phi2)
      const p3 = getPt(theta2, phi2)
      const p4 = getPt(theta2, phi1)

      if (p1.continent && p2.continent && p3.continent && p4.continent) {
        faces.push([p1, p2, p3])
        faces.push([p1, p3, p4])

        if ((i * 7 + j * 13) % 43 === 0 && p1.y > -0.6 && p1.y < 0.7) {
          greenPins.push({ x: p1.x * 1.05, y: p1.y * 1.05, z: p1.z * 1.05 })
        }
      }
    }
  }
  return { faces, greenPins }
}

// Build orbiting low-poly clouds / stardust formations
const buildClouds = () => {
  const clouds = []
  const cloudConfigs = [
    { r: 1.25, lat: -0.3, lon: 0.4, size: 0.12 },
    { r: 1.32, lat: 0.25, lon: 1.8, size: 0.15 },
    { r: 1.22, lat: 0.5, lon: 3.2, size: 0.13 },
    { r: 1.28, lat: -0.45, lon: 4.5, size: 0.14 },
    { r: 1.35, lat: 0.1, lon: 5.5, size: 0.16 },
  ]

  cloudConfigs.forEach((c, idx) => {
    const blocks = [
      { dx: 0, dy: 0, dz: 0, scale: 1.0 },
      { dx: 0.06, dy: 0.02, dz: 0, scale: 0.7 },
      { dx: -0.05, dy: -0.01, dz: 0.03, scale: 0.75 },
      { dx: 0.02, dy: 0.04, dz: -0.04, scale: 0.65 },
    ]
    clouds.push({ ...c, blocks, id: idx })
  })
  return clouds
}

const { faces: continentFaces, greenPins } = buildSphereMesh(24, 48)
const clouds = buildClouds()

// 3D rotation helper
const rotate3D = (pt, angX, angY) => {
  let x = pt.x * Math.cos(angY) + pt.z * Math.sin(angY)
  let y = pt.y
  let z = -pt.x * Math.sin(angY) + pt.z * Math.cos(angY)
  
  const y2 = y * Math.cos(angX) - z * Math.sin(angX)
  const z2 = y * Math.sin(angX) + z * Math.cos(angX)
  
  return { x, y: y2, z: z2 }
}

// Linear color interpolation helper
const lerp = (a, b, t) => a + (b - a) * t
const lerpRGB = (r1, g1, b1, r2, g2, b2, t) => {
  const r = Math.round(lerp(r1, r2, t))
  const g = Math.round(lerp(g1, g2, t))
  const b = Math.round(lerp(b1, b2, t))
  return `rgb(${r}, ${g}, ${b})`
}
const lerpRGBA = (r1, g1, b1, a1, r2, g2, b2, a2, t) => {
  const r = Math.round(lerp(r1, r2, t))
  const g = Math.round(lerp(g1, g2, t))
  const b = Math.round(lerp(b1, b2, t))
  const a = (lerp(a1, a2, t)).toFixed(2)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// Track scrolling to drive rotation, vertical globe translation, and day->night theme transition
const handleScroll = () => {
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight || 1

  scrollRatio = Math.min(1, Math.max(0, scrollY / (maxScroll * 0.8)))
  targetAngle = scrollY * 0.0032

  if (canvasRef.value) {
    const h = canvasRef.value.height
    // At scroll=0 (top), globe is at bottom (h * 0.82)
    // At scroll=1 (bottom), globe moves up to the top (h * 0.22)
    // Reverse scrolling reverses this trajectory automatically
    targetGlobeY = h * 0.82 - (scrollRatio * h * 0.60)
  }

  // Update dynamic CSS theme variables across the entire website
  const root = document.documentElement.style
  // Keep background transition smoothly darkening across the entire journey exactly as it is
  root.setProperty('--page-bg', lerpRGB(240, 244, 248, 4, 6, 18, scrollRatio))

  // Decouple UI theme transition so cards and texts complete their shift to crisp, high-contrast Cosmic Dark style early in the scroll (between 3% and 15%)
  // This guarantees zero mid-way muddy gray collisions across "How It Works" and future narrative cards
  const uiRatio = Math.min(1, Math.max(0, (scrollRatio - 0.03) / 0.12))

  root.setProperty('--text-primary', lerpRGB(15, 23, 42, 248, 250, 252, uiRatio))
  root.setProperty('--text-secondary', lerpRGB(71, 85, 105, 203, 213, 225, uiRatio))
  root.setProperty('--card-bg', lerpRGBA(255, 255, 255, 0.88, 11, 15, 27, 0.88, uiRatio))
  root.setProperty('--card-border', lerpRGBA(226, 232, 240, 0.8, 51, 65, 85, 0.80, uiRatio))
  root.setProperty('--navbar-bg', lerpRGBA(255, 255, 255, 0.82, 11, 15, 27, 0.85, uiRatio))
}

const render = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  
  if (currentGlobeY === -1) {
    currentGlobeY = h * 0.82
    targetGlobeY = h * 0.82
  }

  ctx.clearRect(0, 0, w, h)

  // Smooth elastic scrollytelling damping
  angle += (targetAngle - angle) * 0.08
  currentGlobeY += (targetGlobeY - currentGlobeY) * 0.07
  time += 1

  // Center position of globe
  const cx = w >= 1024 ? w * 0.45 : w / 2
  const radius = Math.min(w, h) * 0.36
  const levitationOffset = Math.sin(time * 0.02) * 10
  const globeY = currentGlobeY + levitationOffset

  // 0. Render Twinkling Space Galaxy Stars (Emerges smoothly with user scroll)
  if (scrollRatio > 0.02) {
    stars.forEach(star => {
      const sx = star.x * w
      const sy = star.y * h
      const twinkle = Math.sin(time * 0.06 + star.phase) * 0.4 + 0.6
      const alpha = twinkle * Math.min(1, scrollRatio * 1.5)
      
      ctx.fillStyle = star.color
      ctx.globalAlpha = alpha * 0.9
      ctx.beginPath()
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1.0
  }

  // 1. Atmosphere / Nebula Glow Around Globe
  const glowGrad = ctx.createRadialGradient(cx, globeY, radius * 0.7, cx, globeY, radius * 1.6)
  glowGrad.addColorStop(0, lerpRGBA(180, 225, 248, 0.45, 99, 102, 241, 0.4, scrollRatio))
  glowGrad.addColorStop(0.5, lerpRGBA(215, 235, 252, 0.15, 168, 85, 247, 0.2, scrollRatio))
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(cx, globeY, radius * 1.6, 0, Math.PI * 2)
  ctx.fill()

  // 2. Skeuomorphic 3D Globe Base (Day Ocean -> Dark Cosmic Space Sphere)
  const globeGrad = ctx.createRadialGradient(
    cx - radius * 0.35, 
    globeY - radius * 0.35, 
    radius * 0.1, 
    cx, 
    globeY, 
    radius * 1.02
  )
  globeGrad.addColorStop(0, lerpRGB(234, 248, 255, 30, 27, 75, scrollRatio))     // High light Specular
  globeGrad.addColorStop(0.3, lerpRGB(186, 228, 248, 15, 23, 42, scrollRatio))   // Mid light
  globeGrad.addColorStop(0.7, lerpRGB(120, 188, 226, 8, 15, 30, scrollRatio))    // Deep ocean void
  globeGrad.addColorStop(0.95, lerpRGB(68, 139, 191, 3, 7, 18, scrollRatio))     // Shadow edge
  globeGrad.addColorStop(1, lerpRGB(46, 110, 158, 0, 0, 0, scrollRatio))         // Outer depth rim
  
  ctx.fillStyle = globeGrad
  ctx.beginPath()
  ctx.arc(cx, globeY, radius, 0, Math.PI * 2)
  ctx.fill()

  // Inner horizon plasma highlight
  const innerRimGrad = ctx.createRadialGradient(cx + radius * 0.35, globeY + radius * 0.35, radius * 0.6, cx, globeY, radius)
  innerRimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
  innerRimGrad.addColorStop(0.85, lerpRGBA(255, 255, 255, 0.25, 56, 189, 248, 0.45, scrollRatio))
  innerRimGrad.addColorStop(1, lerpRGBA(255, 255, 255, 0.4, 168, 85, 247, 0.6, scrollRatio))
  ctx.fillStyle = innerRimGrad
  ctx.beginPath()
  ctx.arc(cx, globeY, radius, 0, Math.PI * 2)
  ctx.fill()

  const tiltX = 0.35

  // 3. Process & Sort Low-Poly Continents
  const transformedFaces = []
  for (const face of continentFaces) {
    const tFace = face.map(pt => rotate3D(pt, tiltX, angle))
    const avgZ = (tFace[0].z + tFace[1].z + tFace[2].z) / 3
    
    if (avgZ > -0.05) { 
      const v1 = { x: tFace[1].x - tFace[0].x, y: tFace[1].y - tFace[0].y, z: tFace[1].z - tFace[0].z }
      const v2 = { x: tFace[2].x - tFace[0].x, y: tFace[2].y - tFace[0].y, z: tFace[2].z - tFace[0].z }
      const nx = v1.y * v2.z - v1.z * v2.y
      const ny = v1.z * v2.x - v1.x * v2.z
      const nz = v1.x * v2.y - v1.y * v2.x
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1
      
      const lx = -0.5, ly = -0.6, lz = 0.6
      const dot = (nx/len)*lx + (ny/len)*ly + (nz/len)*lz
      const brightness = Math.min(1, Math.max(0.1, dot * 0.5 + 0.5))
      
      transformedFaces.push({ pts: tFace, avgZ, brightness })
    }
  }

  transformedFaces.sort((a, b) => a.avgZ - b.avgZ)

  // Draw continent polygons (Ceramic White -> Cybernetic Obsidian in space)
  for (const item of transformedFaces) {
    ctx.beginPath()
    item.pts.forEach((pt, idx) => {
      const px = cx + pt.x * radius
      const py = globeY + pt.y * radius
      if (idx === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()

    let dayColor = [255, 255, 255]
    if (item.brightness > 0.75) dayColor = [248, 253, 255]
    else if (item.brightness > 0.55) dayColor = [226, 241, 248]
    else if (item.brightness > 0.35) dayColor = [197, 226, 240]
    else dayColor = [154, 195, 220]

    // Space galaxy obsidian theme palette
    let spaceColor = [30, 41, 59]
    if (item.brightness > 0.75) spaceColor = [51, 65, 85]
    else if (item.brightness > 0.55) spaceColor = [30, 41, 59]
    else if (item.brightness > 0.35) spaceColor = [15, 23, 42]
    else spaceColor = [7, 12, 24]

    ctx.fillStyle = lerpRGB(dayColor[0], dayColor[1], dayColor[2], spaceColor[0], spaceColor[1], spaceColor[2], scrollRatio)
    ctx.fill()

    // Neon cyan grid outlines in dark mode
    ctx.strokeStyle = lerpRGBA(255, 255, 255, 0.45, 56, 189, 248, 0.55, scrollRatio)
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  // 4. Draw Glowing Neon Green Data Markers
  greenPins.forEach(pin => {
    const tPin = rotate3D(pin, tiltX, angle)
    if (tPin.z > 0.1) {
      const px = cx + tPin.x * radius
      const py = globeY + tPin.y * radius
      const scaleZ = 0.5 + tPin.z * 0.5

      const pulse = Math.sin(time * 0.1 + px) * 2 + 8
      const pinGlow = ctx.createRadialGradient(px, py, 0, px, py, pulse * scaleZ * 2)
      pinGlow.addColorStop(0, 'rgba(34, 197, 94, 0.8)')
      pinGlow.addColorStop(0.5, 'rgba(34, 197, 94, 0.3)')
      pinGlow.addColorStop(1, 'rgba(34, 197, 94, 0)')
      
      ctx.fillStyle = pinGlow
      ctx.beginPath()
      ctx.arc(px, py, pulse * scaleZ * 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#10B981'
      ctx.beginPath()
      ctx.arc(px, py, 5 * scaleZ, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(px - 1, py - 1, 2 * scaleZ, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // 5. Draw Orbiting Low-Poly Clouds / Cosmic Stardust Plasma
  clouds.forEach(cloud => {
    const currentLon = cloud.lon + angle * 0.8 + Math.sin(time * 0.01) * 0.05
    const cx3d = Math.cos(cloud.lat) * Math.cos(currentLon) * cloud.r
    const cy3d = Math.sin(cloud.lat) * cloud.r + Math.sin(time * 0.03 + cloud.id) * 0.03
    const cz3d = Math.cos(cloud.lat) * Math.sin(currentLon) * cloud.r

    const tCloud = rotate3D({ x: cx3d, y: cy3d, z: cz3d }, tiltX, 0)

    if (tCloud.z > -0.3) {
      const cloudX = cx + tCloud.x * radius
      const cloudY = globeY + tCloud.y * radius
      const cloudScale = cloud.size * radius * (0.7 + tCloud.z * 0.3)

      cloud.blocks.forEach((blk) => {
        const bx = cloudX + blk.dx * radius
        const by = cloudY + blk.dy * radius
        const bSize = cloudScale * blk.scale

        ctx.beginPath()
        ctx.moveTo(bx, by - bSize * 0.6)
        ctx.lineTo(bx + bSize * 0.8, by)
        ctx.lineTo(bx, by + bSize * 0.5)
        ctx.lineTo(bx - bSize * 0.8, by)
        ctx.closePath()
        
        const cloudGrad = ctx.createLinearGradient(bx, by - bSize, bx, by + bSize)
        cloudGrad.addColorStop(0, lerpRGB(255, 255, 255, 168, 85, 247, scrollRatio))
        cloudGrad.addColorStop(0.6, lerpRGB(242, 248, 253, 99, 102, 241, scrollRatio))
        cloudGrad.addColorStop(1, lerpRGB(207, 225, 240, 30, 27, 75, scrollRatio))
        
        ctx.fillStyle = cloudGrad
        ctx.fill()
        ctx.strokeStyle = lerpRGBA(255, 255, 255, 0.8, 168, 85, 247, 0.6, scrollRatio)
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }
  })

  animationId = requestAnimationFrame(render)
}

const handleResize = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  currentGlobeY = canvas.height * 0.82
}

onMounted(() => {
  handleResize()
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize)
  render()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<template>
  <div 
    class="fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden transition-colors duration-200"
    style="background-color: var(--page-bg, #F0F4F8);"
  >
    <!-- Ambient upper atmospheric highlight (Fades out in deep space) -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-white/60 blur-[130px] pointer-events-none rounded-full transition-opacity duration-500" :style="{ opacity: 1 - scrollRatio }"></div>
    
    <!-- Deep space purple/blue galactic nebula backdrop (Emerges in dark space) -->
    <div class="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-black/60 blur-3xl transition-opacity duration-700 pointer-events-none" :style="{ opacity: scrollRatio }"></div>

    <!-- Interactive 3D Skeuomorphic Globe & Twinkling Space Canvas -->
    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full"></canvas>
  </div>
</template>
