<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
const frameCount = 240
const images = []
let currentFrame = 1

// Preload images
const preloadImages = () => {
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image()
    const frameIndex = i.toString().padStart(3, '0')
    img.src = `/dismental_logo/ezgif-frame-${frameIndex}.jpg`
    images.push(img)
  }
}

const drawImage = (index) => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const img = images[index - 1]
  
  if (!img) return

  // We want the image to cover the canvas (like object-fit: cover)
  const render = () => {
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
    const x = (canvas.width / 2) - (img.width / 2) * scale
    const y = (canvas.height / 2) - (img.height / 2) * scale
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
  }

  if (img.complete) {
    render()
  } else {
    img.onload = render
  }
}

const handleScroll = () => {
  // Calculate how far down the page the user has scrolled
  const html = document.documentElement
  const scrollTop = html.scrollTop
  const maxScrollTop = html.scrollHeight - window.innerHeight
  
  if (maxScrollTop === 0) return

  const scrollFraction = scrollTop / maxScrollTop
  const frameIndex = Math.min(
    frameCount - 1,
    Math.floor(scrollFraction * frameCount)
  )
  
  requestAnimationFrame(() => {
    drawImage(frameIndex + 1)
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
  
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('resize', handleResize)
  
  // Draw first frame immediately
  if (images[0]) {
    images[0].onload = () => drawImage(1)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="fixed inset-0 w-full h-full -z-10 bg-black pointer-events-none">
    <canvas ref="canvasRef" class="w-full h-full opacity-60"></canvas>
    <!-- Vignette / gradient overlay to make text readable -->
    <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90"></div>
  </div>
</template>
