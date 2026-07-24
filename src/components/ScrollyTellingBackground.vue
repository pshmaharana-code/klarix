<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
const frameCount = 300
const images = []
let currentFrame = 1
let imagesLoaded = 0

// Preload images
const preloadImages = () => {
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image()
    const frameIndex = i.toString().padStart(3, '0')
    img.src = `/dismental_logo/ezgif-frame-${frameIndex}.png`
    img.onload = () => {
      imagesLoaded++
      // If it's the first frame or currently active frame, try drawing
      if (i === currentFrame && canvasRef.value) {
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

  const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
  
  const drawWidth = img.width * scale
  const drawHeight = img.height * scale
  const x = (canvas.width / 2) - (drawWidth / 2)
  const y = (canvas.height / 2) - (drawHeight / 2)
  
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, x, y, drawWidth, drawHeight)

  // Seamlessly hide the watermark by painting a soft gradient circle EXACTLY over it
  // rather than from the absolute corner. This prevents darkening the 3D logo.
  const watermarkX = x + drawWidth - (150 * scale)
  const watermarkY = y + drawHeight - (150 * scale)
  const gradientRadius = 250 * scale
  
  const gradient = ctx.createRadialGradient(
    watermarkX, watermarkY, 0,
    watermarkX, watermarkY, gradientRadius
  )
  // #0A0A0F matches the exact dark background color of the image
  gradient.addColorStop(0, 'rgba(10, 10, 15, 1)')
  gradient.addColorStop(0.4, 'rgba(10, 10, 15, 1)')
  gradient.addColorStop(1, 'rgba(10, 10, 15, 0)')
  
  ctx.fillStyle = gradient
  ctx.fillRect(
    watermarkX - gradientRadius, 
    watermarkY - gradientRadius, 
    gradientRadius * 2, 
    gradientRadius * 2
  )
}

const handleScroll = () => {
  const html = document.documentElement
  const scrollTop = html.scrollTop || document.body.scrollTop
  const maxScrollTop = html.scrollHeight - window.innerHeight
  
  if (maxScrollTop <= 0) return

  const scrollFraction = scrollTop / maxScrollTop
  const frameIndex = Math.min(
    frameCount - 1,
    Math.floor(scrollFraction * frameCount)
  )
  
  currentFrame = frameIndex + 1
  requestAnimationFrame(() => {
    drawImage(currentFrame)
  })
}

const handleResize = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  drawImage(currentFrame)
}

onMounted(() => {
  preloadImages()
  handleResize()
  
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="fixed inset-0 w-full h-full z-0 pointer-events-none">
    <canvas ref="canvasRef" class="w-full h-full"></canvas>
    
    <!-- Vignette / gradient overlay to make text readable -->
    <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80"></div>
  </div>
</template>
