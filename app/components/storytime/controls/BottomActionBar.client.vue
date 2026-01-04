<script setup lang="ts">
/**
 * storytime-layer BottomActionBar
 *
 * A lightweight, host-agnostic control strip:
 * - Mobile: shows when scrolling up, hides when scrolling down
 * - Desktop: always visible
 * - Navigation: scroll to previous/next `.step`
 * - Share: copy link
 * - Optional video controls if the active visual exposes known methods/refs
 *
 * This intentionally removes partner-stories-only dependencies (analytics, ClapEmitter, Icon).
 */
import { ref, onMounted, onBeforeUnmount, computed, unref, watch } from 'vue'

const props = defineProps<{
  activeIndex: number
  total: number
  activeVisual?: any
  /**
   * Optional: scope `.step` queries to a root element.
   */
  stepsRoot?: HTMLElement | null
  stepSelector?: string
}>()

const isMobile = ref(false)
const visible = ref(true)
let lastScrollY = 0
let scrollRaf = 0

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 1024
  if (!isMobile.value) visible.value = true
}

function onScroll() {
  if (!isMobile.value) return
  cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    const y = window.scrollY || 0
    const delta = y - lastScrollY
    lastScrollY = y
    if (Math.abs(delta) < 2) return
    visible.value = delta < 0
  })
}

const copied = ref(false)
async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1300)
  } catch {
    // ignore
  }
}

const atFirst = computed(() => props.activeIndex <= 0)
const atLast = computed(() => props.activeIndex >= props.total - 1)

function stepElements(): HTMLElement[] {
  const sel = props.stepSelector || '.step'
  const root = props.stepsRoot ?? null
  const list = root ? root.querySelectorAll<HTMLElement>(sel) : document.querySelectorAll<HTMLElement>(sel)
  return Array.from(list)
}

function scrollToStep(index: number) {
  const els = stepElements()
  const el = els[index]
  if (!el) return
  const r = el.getBoundingClientRect()
  const targetY = window.scrollY + r.top - (window.innerHeight / 2 - r.height / 2)
  window.scrollTo({ top: targetY, behavior: 'smooth' })
}

function go(delta: number) {
  const target = Math.min(props.total - 1, Math.max(0, props.activeIndex + delta))
  if (target === props.activeIndex) return
  scrollToStep(target)
}

type ActiveVisualLike = {
  __isHeroVideo?: boolean
  play?: () => void
  pause?: () => void
  toggleMute?: () => void
  isPlaying?: { value: boolean }
  isMuted?: { value: boolean }
} | null

const active = computed(() => {
  const inst = unref(props.activeVisual as any) || null
  return inst && inst.$?.exposed ? inst.$.exposed : inst
})

const hasVideo = computed(() => {
  const v = active.value
  return !!(v && (v as any).__isHeroVideo === true)
})

const playing = ref(false)
const muted = ref(false)

let stopWatchPlaying: (() => void) | null = null
let stopWatchMuted: (() => void) | null = null

watch(
  active,
  (v, _prev, onCleanup) => {
    stopWatchPlaying?.(); stopWatchMuted?.()
    stopWatchPlaying = stopWatchMuted = null

    if (!v || (v as any).__isHeroVideo !== true) {
      playing.value = false
      muted.value = false
      return
    }

    if (v.isPlaying) {
      stopWatchPlaying = watch(v.isPlaying, (val: boolean) => {
        playing.value = !!val
      }, { immediate: true })
    }

    if (v.isMuted) {
      stopWatchMuted = watch(v.isMuted, (val: boolean) => {
        muted.value = !!val
      }, { immediate: true })
    }

    onCleanup(() => {
      stopWatchPlaying?.(); stopWatchMuted?.()
      stopWatchPlaying = stopWatchMuted = null
    })
  },
  { immediate: true },
)

function togglePlay() {
  const v = unref(props.activeVisual as ActiveVisualLike)
  if (!v || v.__isHeroVideo !== true) return
  if (playing.value) v.pause?.()
  else v.play?.()
}

function toggleMute() {
  const v = unref(props.activeVisual as ActiveVisualLike)
  if (!v || v.__isHeroVideo !== true) return
  v.toggleMute?.()
}

const progressPercent = computed(() => {
  const total = Math.max(1, Number(props.total || 1))
  const current = Math.min(total, Math.max(0, Number(props.activeIndex ?? 0) + 1))
  return Math.round((current / total) * 100)
})

onMounted(() => {
  updateIsMobile()
  lastScrollY = window.scrollY || 0
  window.addEventListener('resize', updateIsMobile)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIsMobile)
  window.removeEventListener('scroll', onScroll)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
})
</script>

<template>
  <div
    class="fixed left-1/2 -translate-x-1/2 z-[1000] transition-all duration-300"
    :class="[visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none']"
    style="bottom: 18px;"
    aria-live="polite"
  >
    <div v-if="copied" class="mx-auto mb-2 w-max px-3 py-1 rounded-full text-xs bg-black/80 text-white text-center">
      Link copied
    </div>

    <div class="bg-white/95 backdrop-blur-sm shadow-[0_6px_24px_rgba(0,0,0,.12)] rounded-full px-3 py-2 flex items-center gap-1 relative overflow-hidden">
      <button
        class="hidden lg:inline-flex p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 transition-colors"
        :disabled="atFirst"
        aria-label="Previous"
        @click="go(-1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M12 7.5a1 1 0 0 1 .7.3l6 6a1 1 0 1 1-1.4 1.4L12 9.91l-5.3 5.29a1 1 0 1 1-1.4-1.42l6-6a1 1 0 0 1 .7-.28Z"/></svg>
      </button>

      <div class="hidden lg:block mx-1 w-px h-6 bg-gray-200" />

      <template v-if="hasVideo">
        <button class="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors" :aria-label="playing ? 'Pause' : 'Play'" @click="togglePlay">
          <svg v-if="playing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <div class="mx-1 w-px h-6 bg-gray-200" />
        <button class="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors" :aria-label="muted ? 'Sound off' : 'Sound on'" @click="toggleMute">
          <svg v-if="muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5Z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5Z"/><path d="M19 5a8 8 0 0 1 0 14"/><path d="M15 9a4 4 0 0 1 0 6"/></svg>
        </button>
        <div class="mx-1 w-px h-6 bg-gray-200" />
      </template>

      <button class="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors" aria-label="Copy link" @click="copyLink">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M10.59 13.41a1 1 0 0 0 1.41 1.41l4-4a1 1 0 1 0-1.41-1.41l-4 4ZM12.83 5.17a4 4 0 0 1 5.66 5.66l-1.41 1.41a1 1 0 0 1-1.41-1.41l1.41-1.41a2 2 0 0 0-2.83-2.83l-2 2a1 1 0 1 1-1.41-1.41l2-2ZM6.93 11.07a1 1 0 0 1 1.41 1.41l-1.41 1.41A2 2 0 0 0 9.76 17.1l2-2a1 1 0 1 1 1.41 1.41l-2 2a4 4 0 1 1-5.66-5.66l1.42-1.42Z"/></svg>
      </button>

      <div class="hidden lg:block mx-1 w-px h-6 bg-gray-200" />

      <button class="hidden lg:inline-flex p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-40" :disabled="atLast" aria-label="Next" @click="go(1)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 rotate-180"><path fill="currentColor" d="M12 7.5a1 1 0 0 1 .7.3l6 6a1 1 0 1 1-1.4 1.4L12 9.91l-5.3 5.29a1 1 0 1 1-1.4-1.42l6-6a1 1 0 0 1 .7-.28Z"/></svg>
      </button>

      <div aria-hidden="true" class="pointer-events-none absolute left-2 right-2 bottom-0 h-1 rounded-full bg-gray-200/70 overflow-hidden">
        <div class="h-full" :style="{ width: progressPercent + '%', background: 'var(--brand-primary, #007c7e)', transition: 'width 280ms ease' }" />
      </div>
    </div>
  </div>
</template>

