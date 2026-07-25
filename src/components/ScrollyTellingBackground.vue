<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
const scrollFraction = ref(0)
const isLoaded = ref(false)
const frameCount = 300
const images = []
let currentFrame = 1
let imagesLoaded = 0
let isDrawing = false

// Preload all 300 frames of the 3D disassembly animation
const preloadImages = () => {
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image()
    const frameIndex = i.toString().padStart(3, '0')
    img.src = `/dismental_logo/ezgif-frame-${frameIndex}.png`
    img.onload = () => {
      imagesLoaded++
      if (i === currentFrame && canvasRef.value && !isDrawing) {
        drawImage(currentFrame)
      }
    }
    images.push(img)
  }
}

const drawImage = (index) => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const img = images[index - 1]
  
  if (!img || !img.complete || img.width === 0) return

  isDrawing = true
  
  // Crop 2.5% from left and right edges to eliminate all dark encoding perimeter lines and corner dots
  const cropX = img.width * 0.025
  const drawW = img.width * 0.95
  
  // Crop 8% from top and bottom to decrease overall box height and create a sleeker cinematic ratio
  const cropY = img.height * 0.08
  const drawH = img.height * 0.84
  
  const targetW = Math.round(drawW)
  const targetH = Math.round(drawH)
  
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }
  
  // Render precision-cropped image edge-to-edge (ZERO perimeter black lines or encoding artifacts)
  ctx.drawImage(img, cropX, cropY, drawW, drawH, 0, 0, canvas.width, canvas.height)
  
  isDrawing = false
}

const handleScroll = () => {
  const html = document.documentElement
  const scrollTop = html.scrollTop || document.body.scrollTop
  const maxScrollTop = html.scrollHeight - window.innerHeight
  
  if (maxScrollTop <= 0) return

  const fraction = Math.min(1, Math.max(0, scrollTop / maxScrollTop))
  scrollFraction.value = fraction

  const frameIndex = Math.min(
    frameCount - 1,
    Math.floor(fraction * frameCount)
  )
  
  if (frameIndex + 1 !== currentFrame) {
    currentFrame = frameIndex + 1
    requestAnimationFrame(() => {
      drawImage(currentFrame)
    })
  }
}

const handleResize = () => {
  drawImage(currentFrame)
}

onMounted(() => {
  preloadImages()
  handleScroll()
  
  setTimeout(() => { isLoaded.value = true }, 250)

  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <!-- Frosted Glass Bezel Card with Reactive Scroll Parallax & Zero-Gravity Motion -->
  <div 
    class="fixed right-6 lg:right-10 xl:right-16 top-1/2 w-[340px] lg:w-[420px] xl:w-[480px] 2xl:w-[520px] z-[5] pointer-events-none hidden lg:block select-none transition-all duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
    :class="isLoaded ? 'opacity-100' : 'opacity-0'"
    :style="{
      transform: `translateX(${isLoaded ? '0px' : '130%'}) translateY(calc(-50% + ${Math.sin(scrollFraction * Math.PI * 2) * 45}px)) rotate(${Math.cos(scrollFraction * Math.PI * 1.5) * -3}deg)`
    }"
  >
    <div 
      class="relative w-full rounded-[2.6rem] backdrop-blur-2xl border shadow-[0_25px_75px_rgba(79,70,229,0.22)] overflow-hidden transition-all duration-500 group hover:shadow-[0_30px_90px_rgba(79,70,229,0.3)] p-3 floating-card"
      style="background-color: var(--card-bg, rgba(255, 255, 255, 0.45)); border-color: var(--card-border, rgba(255, 255, 255, 0.85));"
    >
      <!-- Smoothly rounded inner viewport displaying the precision-cropped cinematic render -->
      <div class="relative w-full h-auto rounded-[2rem] overflow-hidden shadow-inner flex items-center justify-center bg-transparent">
        <canvas ref="canvasRef" class="w-full h-auto block object-contain transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes weightless-float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-14px) rotate(-1.5deg);
  }
  66% {
    transform: translateY(10px) rotate(1.2deg);
  }
}
.floating-card {
  animation: weightless-float 7s ease-in-out infinite;
}
</style>
