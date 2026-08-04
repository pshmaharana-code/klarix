/**
 * ScrollAnimations.js
 * Centralized GSAP ScrollTrigger animation registration for Klarix landing page.
 * Uses GSAP (already in package.json) with ScrollTrigger plugin.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Reveal elements with a slide-up + fade effect when they enter the viewport.
 * @param {string|Element|Element[]} targets - CSS selector or element(s)
 * @param {object} options - Override defaults
 */
export function revealUp(targets, options = {}) {
  gsap.from(targets, {
    y: options.y ?? 60,
    opacity: 0,
    duration: options.duration ?? 1,
    ease: options.ease ?? 'power3.out',
    stagger: options.stagger ?? 0.15,
    scrollTrigger: {
      trigger: options.trigger ?? targets,
      start: options.start ?? 'top 85%',
      end: options.end ?? 'top 20%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger
    }
  })
}

/**
 * Reveal elements sliding in from the left.
 */
export function revealLeft(targets, options = {}) {
  gsap.from(targets, {
    x: options.x ?? -80,
    opacity: 0,
    duration: options.duration ?? 1,
    ease: options.ease ?? 'power3.out',
    stagger: options.stagger ?? 0.15,
    scrollTrigger: {
      trigger: options.trigger ?? targets,
      start: options.start ?? 'top 85%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger
    }
  })
}

/**
 * Reveal elements sliding in from the right.
 */
export function revealRight(targets, options = {}) {
  gsap.from(targets, {
    x: options.x ?? 80,
    opacity: 0,
    duration: options.duration ?? 1,
    ease: options.ease ?? 'power3.out',
    stagger: options.stagger ?? 0.15,
    scrollTrigger: {
      trigger: options.trigger ?? targets,
      start: options.start ?? 'top 85%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger
    }
  })
}

/**
 * Scale-in reveal effect (0.85 → 1.0).
 */
export function revealScale(targets, options = {}) {
  gsap.from(targets, {
    scale: options.scale ?? 0.85,
    opacity: 0,
    duration: options.duration ?? 1.2,
    ease: options.ease ?? 'power3.out',
    scrollTrigger: {
      trigger: options.trigger ?? targets,
      start: options.start ?? 'top 85%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger
    }
  })
}

/**
 * Parallax effect — element moves at a different speed during scroll.
 * @param {string|Element} target
 * @param {number} speed - Parallax multiplier (positive = slower, negative = faster)
 */
export function parallax(target, speed = 50, options = {}) {
  gsap.to(target, {
    y: speed,
    ease: 'none',
    scrollTrigger: {
      trigger: options.trigger ?? target,
      start: options.start ?? 'top bottom',
      end: options.end ?? 'bottom top',
      scrub: options.scrub ?? 1,
      ...options.scrollTrigger
    }
  })
}

/**
 * Counter animation — animates a number from 0 to a target value.
 * @param {Element} element - The DOM element to update
 * @param {number} endValue - Target number
 * @param {object} options
 */
export function animateCounter(element, endValue, options = {}) {
  const obj = { val: 0 }
  const prefix = options.prefix ?? ''
  const suffix = options.suffix ?? ''
  const decimals = options.decimals ?? 0

  gsap.to(obj, {
    val: endValue,
    duration: options.duration ?? 2,
    ease: options.ease ?? 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 80%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger
    },
    onUpdate: () => {
      element.textContent = prefix + obj.val.toFixed(decimals) + suffix
    }
  })
}

/**
 * Stagger children elements with reveal animations.
 */
export function staggerReveal(parent, childSelector, options = {}) {
  gsap.from(`${parent} ${childSelector}`, {
    y: options.y ?? 40,
    opacity: 0,
    duration: options.duration ?? 0.8,
    ease: options.ease ?? 'power3.out',
    stagger: options.stagger ?? 0.2,
    scrollTrigger: {
      trigger: parent,
      start: options.start ?? 'top 80%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger
    }
  })
}

/**
 * Pin a section while scrolling content over it.
 */
export function pinSection(trigger, options = {}) {
  ScrollTrigger.create({
    trigger,
    start: options.start ?? 'top top',
    end: options.end ?? '+=100%',
    pin: options.pin ?? true,
    pinSpacing: options.pinSpacing ?? true,
    ...options
  })
}

/**
 * Word-by-word text reveal animation.
 * Wraps each word in a span and animates them sequentially.
 * @param {Element} element - The text element
 */
export function splitTextReveal(element, options = {}) {
  const text = element.textContent
  const words = text.split(' ')
  element.innerHTML = words.map(w => `<span class="inline-block" style="opacity: 0; transform: translateY(20px);">${w}</span>`).join(' ')

  gsap.to(element.querySelectorAll('span'), {
    opacity: 1,
    y: 0,
    duration: options.duration ?? 0.6,
    ease: options.ease ?? 'power3.out',
    stagger: options.stagger ?? 0.05,
    scrollTrigger: {
      trigger: element,
      start: options.start ?? 'top 85%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger
    }
  })
}

/**
 * Refresh all ScrollTrigger instances (call after DOM changes).
 */
export function refreshScrollTrigger() {
  ScrollTrigger.refresh()
}

export { gsap, ScrollTrigger }
