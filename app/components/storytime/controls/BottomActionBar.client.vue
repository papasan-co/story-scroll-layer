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
 * This intentionally avoids partner-specific dependencies while preserving the
 * common remote behavior from the hard-coded story reels.
 */
import { ref, onMounted, onBeforeUnmount, computed, nextTick, toRaw, unref, watch } from 'vue'
import type { StoryControlsMode, StoryJumpAlign } from '../../../types/storytime/scenes'

const props = defineProps<{
  activeIndex: number
  total: number
  activeVisual?: any
  controlMode?: StoryControlsMode
  /**
   * @deprecated Use controlMode. Existing WE-2 payloads may still send variant=we2.
   */
  variant?: 'default' | 'minimal' | 'we2'
  showShare?: boolean
  showProgress?: boolean
  showVideoControls?: boolean
  hideOnMobileBelow?: number
  autoHideOnMobile?: boolean
  bottomOffsetPx?: number
  responsiveBottomOffsetPx?: Array<{
    minWidth?: number
    maxWidth?: number
    value: number
  }>
  mobileCta?: {
    url?: string
    label?: string
    suffix?: string
    ariaLabel?: string
    target?: '_blank' | '_self'
    rel?: string
    trackLabel?: string
    trackModifier?: string
  } | null
  reaction?: {
    enabled?: boolean
    label?: string
    count?: number
    modifier?: string
  } | null
  jumpAlign?: StoryJumpAlign
  jumpEndOffsetPx?: number
  jumpTarget?: 'step' | 'card'
  /**
   * Optional: scope `.step` queries to a root element.
   */
  stepsRoot?: HTMLElement | null
  stepSelector?: string
  stepTargetResolver?: (activeIndex: number, delta: number) => number | null
  stepJumper?: (index: number, behavior: ScrollBehavior, direction: number) => boolean
  canGoPrevious?: boolean
  canGoNext?: boolean
  /**
   * Optional scroll container (panel-scroll mode).
   * When provided, navigation scrolls this container instead of the window.
   */
  scrollContainer?: HTMLElement | null
}>()

const isMobile = ref(false)
const viewportWidth = ref(0)
const visible = ref(true)
let lastScrollY = 0
let scrollRaf = 0

const updateIsMobile = () => {
  const threshold = typeof props.hideOnMobileBelow === 'number' && Number.isFinite(props.hideOnMobileBelow)
    ? props.hideOnMobileBelow
    : 1024
  viewportWidth.value = window.innerWidth
  isMobile.value = viewportWidth.value <= threshold
  if (!isMobile.value || props.autoHideOnMobile === false) visible.value = true
}

function onScroll() {
  if (!isMobile.value) return
  if (props.autoHideOnMobile === false) {
    visible.value = true
    lastScrollY = window.scrollY || 0
    return
  }
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

type ReactionParticle = {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  size: number
  rotate: number
  duration: number
}

const reactionCountsByStep = ref<Record<number, number>>({})
const reactionButtonRef = ref<HTMLElement | null>(null)
const reactionParticles = ref<ReactionParticle[]>([])
let reactionParticleSeed = 1
const reactionBaseCount = computed(() => {
  const count = props.reaction?.count
  return typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
})
const reactionDelta = computed(() => reactionCountsByStep.value[props.activeIndex] ?? 0)
const reactionCount = computed(() => reactionBaseCount.value + reactionDelta.value)
const showReactionControl = computed(() => props.reaction?.enabled === true)
const reactionLabel = computed(() => {
  const label = props.reaction?.label
  return typeof label === 'string' && label.trim() ? label.trim() : 'React'
})
const reactionModifier = computed(() => {
  const modifier = props.reaction?.modifier
  return typeof modifier === 'string' && modifier.trim() ? modifier.trim() : 'reaction'
})
function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

async function burstReactionParticles(sourceEl: HTMLElement, count = 8) {
  const rect = sourceEl.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const created = Array.from({ length: count }, () => ({
    id: reactionParticleSeed++,
    x,
    y,
    dx: randomBetween(-58, 58),
    dy: randomBetween(-150, -235),
    size: randomBetween(16, 21),
    rotate: randomBetween(-26, 26),
    duration: randomBetween(780, 1120),
  }))

  reactionParticles.value = [...reactionParticles.value, ...created]
  await nextTick()

  window.setTimeout(() => {
    const ids = new Set(created.map(p => p.id))
    reactionParticles.value = reactionParticles.value.filter(p => !ids.has(p.id))
  }, 1300)
}

function react() {
  const key = Number(props.activeIndex ?? 0)
  reactionCountsByStep.value = {
    ...reactionCountsByStep.value,
    [key]: (reactionCountsByStep.value[key] ?? 0) + 1,
  }

  if (reactionButtonRef.value) {
    void burstReactionParticles(reactionButtonRef.value)
  }
}

const previousTarget = computed(() => {
  const resolved = props.stepTargetResolver?.(props.activeIndex, -1)
  if (resolved === null) return props.activeIndex
  return typeof resolved === 'number'
    ? resolved
    : Math.max(0, props.activeIndex - 1)
})
const nextTarget = computed(() => {
  const resolved = props.stepTargetResolver?.(props.activeIndex, 1)
  if (resolved === null) return props.activeIndex
  return typeof resolved === 'number'
    ? resolved
    : Math.min(props.total - 1, props.activeIndex + 1)
})
const atFirst = computed(() => {
  if (typeof props.canGoPrevious === 'boolean') return !props.canGoPrevious
  return previousTarget.value === props.activeIndex || props.activeIndex <= 0
})
const atLast = computed(() => {
  if (typeof props.canGoNext === 'boolean') return !props.canGoNext
  return nextTarget.value === props.activeIndex || props.activeIndex >= props.total - 1
})

function stepElements(): HTMLElement[] {
  const sel = props.stepSelector || '.step'
  const root = props.stepsRoot ?? null
  const list = root ? root.querySelectorAll<HTMLElement>(sel) : document.querySelectorAll<HTMLElement>(sel)
  return Array.from(list)
}

function scrollToStep(index: number) {
  const direction = index < props.activeIndex ? -1 : 1
  if (props.stepJumper?.(index, 'smooth', direction)) return

  const els = stepElements()
  const el = els[index]
  if (!el) return
  const targetEl = props.jumpTarget === 'card'
    ? el.querySelector<HTMLElement>('[data-article-card]') || el
    : el
  const r = targetEl.getBoundingClientRect()
  const endOffsetPx = typeof props.jumpEndOffsetPx === 'number' && Number.isFinite(props.jumpEndOffsetPx)
    ? Math.max(0, props.jumpEndOffsetPx)
    : 0

  const root = props.scrollContainer ?? null
  if (root) {
    const rootRect = root.getBoundingClientRect()
    const offsetTop = r.top - rootRect.top
    const target = props.jumpAlign === 'start'
      ? root.scrollTop + offsetTop
      : props.jumpAlign === 'end'
      ? root.scrollTop + offsetTop + r.height + endOffsetPx - root.clientHeight
      : root.scrollTop + offsetTop - (root.clientHeight / 2 - r.height / 2)
    root.scrollTo({ top: target, behavior: 'smooth' })
    return
  }

  const targetY = props.jumpAlign === 'start'
    ? window.scrollY + r.top
    : props.jumpAlign === 'end'
    ? window.scrollY + r.top + r.height + endOffsetPx - window.innerHeight
    : window.scrollY + r.top - (window.innerHeight / 2 - r.height / 2)
  window.scrollTo({ top: targetY, behavior: 'smooth' })
}

function go(delta: number) {
  const target = delta < 0 ? previousTarget.value : nextTarget.value
  if (target === props.activeIndex) {
    props.stepJumper?.(props.activeIndex, 'smooth', delta)
    return
  }
  scrollToStep(target)
}

type ActiveVisualLike = {
  __isHeroVideo?: boolean
  play?: () => void
  pause?: () => void
  toggleMute?: () => void
  volumeUp?: (step?: number) => void
  volumeDown?: (step?: number) => void
  isPlaying?: { value: boolean }
  isMuted?: { value: boolean }
  volume?: { value: number }
} | null

const active = computed(() => {
  const inst = unref(props.activeVisual as any) || null
  const rawInst = inst && typeof inst === 'object' ? toRaw(inst) : inst
  const exposed = rawInst && (rawInst as any).$?.exposed ? (rawInst as any).$.exposed : rawInst
  return exposed && typeof exposed === 'object' ? toRaw(exposed) : exposed
})

const hasVideo = computed(() => {
  const v = active.value
  return props.showVideoControls !== false && !!(v && (
    (v as any).__isHeroVideo === true ||
    (v as any).isPlaying ||
    (v as any).isMuted ||
    (typeof (v as any).play === 'function' && typeof (v as any).pause === 'function')
  ))
})

const playing = ref(false)
const muted = ref(false)
const vol = ref(1)
const showVolumeBar = ref(false)

let stopWatchPlaying: (() => void) | null = null
let stopWatchMuted: (() => void) | null = null
let stopWatchVolume: (() => void) | null = null
let volumeHideTimer: ReturnType<typeof window.setTimeout> | null = null

watch(
  active,
  (v, _prev, onCleanup) => {
    stopWatchPlaying?.(); stopWatchMuted?.(); stopWatchVolume?.()
    stopWatchPlaying = stopWatchMuted = stopWatchVolume = null

    if (!v || !hasVideo.value) {
      playing.value = false
      muted.value = false
      vol.value = 1
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

    if ((v as any).volume) {
      stopWatchVolume = watch((v as any).volume, (val: number) => {
        vol.value = typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 1
      }, { immediate: true })
    }

    onCleanup(() => {
      stopWatchPlaying?.(); stopWatchMuted?.(); stopWatchVolume?.()
      stopWatchPlaying = stopWatchMuted = stopWatchVolume = null
    })
  },
  { immediate: true },
)

function togglePlay() {
  const v = active.value as ActiveVisualLike
  if (!v) return
  if (playing.value) v.pause?.()
  else v.play?.()
}

function toggleMute() {
  const v = active.value as ActiveVisualLike
  if (!v) return
  v.toggleMute?.()
}

const showVolumeDownControl = computed(() => {
  const v = active.value as ActiveVisualLike
  return hasVideo.value && !!v && typeof v.volumeDown === 'function'
})
const showVolumeUpControl = computed(() => {
  const v = active.value as ActiveVisualLike
  return hasVideo.value && !!v && typeof v.volumeUp === 'function'
})
const hasVolumeControls = computed(() => {
  return showVolumeDownControl.value || showVolumeUpControl.value
})
const volumePercent = computed(() => Math.round(Math.max(0, Math.min(1, vol.value)) * 100))
function revealVolumeBar() {
  showVolumeBar.value = true
  if (volumeHideTimer) window.clearTimeout(volumeHideTimer)
  volumeHideTimer = window.setTimeout(() => { showVolumeBar.value = false }, 1400)
}

function volumeDown() {
  const v = active.value as ActiveVisualLike
  v?.volumeDown?.()
  revealVolumeBar()
}

function volumeUp() {
  const v = active.value as ActiveVisualLike
  v?.volumeUp?.()
  revealVolumeBar()
}

const progressPercent = computed(() => {
  const total = Math.max(1, Number(props.total || 1))
  const current = Math.min(total, Math.max(0, Number(props.activeIndex ?? 0) + 1))
  return Math.round((current / total) * 100)
})
const showShareControl = computed(() => props.showShare !== false)
const showProgressControl = computed(() => props.showProgress !== false)
const mobileCta = computed(() => props.mobileCta || null)
const mobileCtaUrl = computed(() => {
  const url = mobileCta.value?.url
  return typeof url === 'string' && url.trim() ? url.trim() : ''
})
const mobileCtaLabel = computed(() => {
  const label = mobileCta.value?.label
  return typeof label === 'string' && label.trim() ? label.trim() : 'Open'
})
const mobileCtaSuffix = computed(() => {
  const suffix = mobileCta.value?.suffix
  return typeof suffix === 'string' && suffix.trim() ? suffix.trim() : ''
})
const mobileCtaTarget = computed(() => mobileCta.value?.target === '_blank' ? '_blank' : '_self')
const mobileCtaRel = computed(() => {
  const rel = mobileCta.value?.rel
  if (typeof rel === 'string' && rel.trim()) return rel.trim()
  return mobileCtaTarget.value === '_blank' ? 'noopener noreferrer' : undefined
})
const mobileCtaAriaLabel = computed(() => {
  const label = mobileCta.value?.ariaLabel
  return typeof label === 'string' && label.trim() ? label.trim() : mobileCtaLabel.value
})
const mobileCtaTrackLabel = computed(() => {
  const label = mobileCta.value?.trackLabel
  return typeof label === 'string' && label.trim() ? label.trim() : mobileCtaLabel.value
})
const mobileCtaTrackModifier = computed(() => {
  const modifier = mobileCta.value?.trackModifier
  return typeof modifier === 'string' && modifier.trim() ? modifier.trim() : 'mobile-cta'
})
const controlsMode = computed<StoryControlsMode>(() => {
  if (props.controlMode === 'minimal' || props.controlMode === 'pill' || props.controlMode === 'arrows') {
    return props.controlMode
  }

  if (props.variant === 'we2') return 'pill'
  return props.variant === 'minimal' ? 'minimal' : 'default'
})
const usesCompactChevron = computed(() => controlsMode.value === 'pill' || controlsMode.value === 'arrows')
const hideForViewport = computed(() => (
  typeof props.hideOnMobileBelow === 'number' &&
  Number.isFinite(props.hideOnMobileBelow) &&
  isMobile.value
))
const responsiveBottomOffsetPx = computed(() => {
  const width = viewportWidth.value
  if (!width || !Array.isArray(props.responsiveBottomOffsetPx)) return undefined

  const rule = props.responsiveBottomOffsetPx.find((entry) => {
    if (!entry || typeof entry.value !== 'number' || !Number.isFinite(entry.value)) return false
    const min = typeof entry.minWidth === 'number' && Number.isFinite(entry.minWidth) ? entry.minWidth : -Infinity
    const max = typeof entry.maxWidth === 'number' && Number.isFinite(entry.maxWidth) ? entry.maxWidth : Infinity
    return width >= min && width <= max
  })

  return rule ? rule.value : undefined
})
const rootStyle = computed<Record<string, string>>(() => {
  const offset = responsiveBottomOffsetPx.value ?? props.bottomOffsetPx
  if (typeof offset === 'number' && Number.isFinite(offset)) {
    return {
      bottom: `calc(${offset}px + env(safe-area-inset-bottom, 0px) + min(var(--story-vv-bottom, 0px), 24px))`,
    }
  }

  return { bottom: '18px' }
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
  if (volumeHideTimer) window.clearTimeout(volumeHideTimer)
})
</script>

<template>
  <div
    v-if="!hideForViewport || mobileCtaUrl"
    class="fixed left-1/2 -translate-x-1/2 z-[1000] transition-all duration-300"
    :class="[visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none']"
    :style="rootStyle"
    data-story-controls-root
    aria-live="polite"
  >
    <div v-if="hasVideo && showVolumeBar" class="mx-auto mb-2 w-[260px] max-w-[80vw]" data-story-controls-volume-bar>
      <div class="h-1.5 rounded-full bg-[var(--story-controls-divider)] overflow-hidden">
        <div class="h-full bg-[var(--story-controls-progress)]" :style="{ width: volumePercent + '%' }" />
      </div>
      <div class="mt-1 text-[10px] text-center text-[var(--story-controls-text)]">Volume {{ volumePercent }}%</div>
    </div>

    <div v-if="copied" class="mx-auto mb-2 w-max px-3 py-1 rounded-full text-xs bg-black/80 text-white text-center">
      Link copied
    </div>

    <a
      v-if="hideForViewport && mobileCtaUrl"
      :href="mobileCtaUrl"
      :target="mobileCtaTarget"
      :rel="mobileCtaRel"
      class="story-controls-mobile-cta"
      data-story-mobile-cta
      data-story-control="mobile-cta"
      data-au-track="story-control"
      :data-au-label="mobileCtaTrackLabel"
      :data-au-modifier="mobileCtaTrackModifier"
      :aria-label="mobileCtaAriaLabel"
    >
      <span>{{ mobileCtaLabel }}</span>
      <span v-if="mobileCtaSuffix" class="story-controls-mobile-cta__suffix" aria-hidden="true">
        {{ mobileCtaSuffix }}
      </span>
    </a>

    <div
      v-else
      class="story-controls-shell backdrop-blur-sm shadow-[0_6px_24px_rgba(0,0,0,.12)] rounded-full px-3 py-2 flex items-center gap-1 relative overflow-hidden"
      :class="[
        `story-controls-shell--${controlsMode}`,
        !showProgressControl ? 'story-controls-shell--no-progress' : '',
      ]"
      data-story-controls
      :data-story-controls-mode="controlsMode"
    >
      <button
        class="story-controls-btn inline-flex p-2 rounded-full disabled:opacity-40 transition-colors"
        data-story-control="previous"
        :disabled="atFirst"
        aria-label="Previous"
        data-au-track="story-control"
        data-au-label="Previous"
        data-au-modifier="previous"
        @click="go(-1)"
      >
        <svg v-if="usesCompactChevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M12 7.5a1 1 0 0 1 .7.3l6 6a1 1 0 1 1-1.4 1.4L12 9.91l-5.3 5.29a1 1 0 1 1-1.4-1.42l6-6a1 1 0 0 1 .7-.28Z"/></svg>
      </button>

      <div class="story-controls-divider mx-1 w-px h-6 bg-[var(--story-controls-divider)]" data-story-controls-divider />

      <button
        v-if="showReactionControl"
        class="story-controls-reaction inline-flex items-center justify-center gap-2 rounded-full transition-colors"
        data-story-control="reaction"
        type="button"
        ref="reactionButtonRef"
        :aria-label="reactionLabel"
        data-au-track="story-control"
        :data-au-label="reactionLabel"
        :data-au-modifier="reactionModifier"
        @click="react"
      >
        <svg class="story-controls-reaction__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8.5 11.3 6.2 8.9a1.55 1.55 0 0 1 2.2-2.18l2.28 2.28" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M11.2 9.7 8.35 6.85a1.55 1.55 0 1 1 2.2-2.18l3.55 3.55" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M14.05 8.17 11.8 5.92a1.48 1.48 0 0 1 2.1-2.1l3.75 3.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M17.5 10.6 16 9.1a1.43 1.43 0 0 1 2.02-2.02l1.88 1.88c1.84 1.84 1.84 4.82 0 6.66l-1.46 1.46a6.2 6.2 0 0 1-8.78 0L5.65 13.1a1.5 1.5 0 0 1 2.12-2.12l2.14 2.14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M5.4 4.2 3.8 2.6M3.7 8.4H1.5M8.5 3.4V1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <span class="story-controls-reaction__count">{{ reactionCount }}</span>
      </button>

      <div v-if="showReactionControl" class="story-controls-divider mx-1 w-px h-6 bg-[var(--story-controls-divider)]" data-story-controls-divider />

      <template v-if="hasVideo">
        <button
          class="story-controls-btn p-2 rounded-full transition-colors"
          data-story-control="play"
          :aria-label="playing ? 'Pause' : 'Play'"
          data-au-track="story-control"
          :data-au-label="playing ? 'Pause' : 'Play'"
          :data-au-modifier="playing ? 'pause' : 'play'"
          @click="togglePlay"
        >
          <svg v-if="playing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <div class="story-controls-divider mx-1 w-px h-6 bg-[var(--story-controls-divider)]" data-story-controls-divider />
        <button
          class="story-controls-btn p-2 rounded-full transition-colors"
          data-story-control="mute"
          :aria-label="muted ? 'Sound off' : 'Sound on'"
          data-au-track="story-control"
          :data-au-label="muted ? 'Sound off' : 'Sound on'"
          :data-au-modifier="muted ? 'unmute' : 'mute'"
          @click="toggleMute"
        >
          <svg v-if="muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5Z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5Z"/><path d="M19 5a8 8 0 0 1 0 14"/><path d="M15 9a4 4 0 0 1 0 6"/></svg>
        </button>
        <div class="story-controls-divider mx-1 w-px h-6 bg-[var(--story-controls-divider)]" data-story-controls-divider />

        <template v-if="hasVolumeControls">
          <button
            v-if="showVolumeDownControl"
            class="story-controls-btn p-2 rounded-full transition-colors"
            data-story-control="volume-down"
            aria-label="Volume down"
            data-au-track="story-control"
            data-au-label="Volume down"
            data-au-modifier="volume-down"
            @click="volumeDown"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M23 12h-4"/></svg>
          </button>
          <button
            v-if="showVolumeUpControl"
            class="story-controls-btn p-2 rounded-full transition-colors"
            data-story-control="volume-up"
            aria-label="Volume up"
            data-au-track="story-control"
            data-au-label="Volume up"
            data-au-modifier="volume-up"
            @click="volumeUp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5Z"/><path d="M19 5a8 8 0 0 1 0 14"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M23 12h-4"/><path d="M21 10v4"/></svg>
          </button>
          <div class="story-controls-divider mx-1 w-px h-6 bg-[var(--story-controls-divider)]" data-story-controls-divider />
        </template>
      </template>

      <button
        v-if="showShareControl"
        class="story-controls-btn p-2 rounded-full transition-colors"
        data-story-control="share"
        aria-label="Copy link"
        data-au-track="story-control"
        data-au-label="Copy link"
        data-au-modifier="share"
        @click="copyLink"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M10.59 13.41a1 1 0 0 0 1.41 1.41l4-4a1 1 0 1 0-1.41-1.41l-4 4ZM12.83 5.17a4 4 0 0 1 5.66 5.66l-1.41 1.41a1 1 0 0 1-1.41-1.41l1.41-1.41a2 2 0 0 0-2.83-2.83l-2 2a1 1 0 1 1-1.41-1.41l2-2ZM6.93 11.07a1 1 0 0 1 1.41 1.41l-1.41 1.41A2 2 0 0 0 9.76 17.1l2-2a1 1 0 1 1 1.41 1.41l-2 2a4 4 0 1 1-5.66-5.66l1.42-1.42Z"/></svg>
      </button>

      <div v-if="showShareControl" class="story-controls-divider mx-1 w-px h-6 bg-[var(--story-controls-divider)]" data-story-controls-divider />

      <button
        class="story-controls-btn inline-flex p-2 rounded-full transition-colors disabled:opacity-40"
        data-story-control="next"
        :disabled="atLast"
        aria-label="Next"
        data-au-track="story-control"
        data-au-label="Next"
        data-au-modifier="next"
        @click="go(1)"
      >
        <svg v-if="usesCompactChevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 rotate-180"><path fill="currentColor" d="M12 7.5a1 1 0 0 1 .7.3l6 6a1 1 0 1 1-1.4 1.4L12 9.91l-5.3 5.29a1 1 0 1 1-1.4-1.42l6-6a1 1 0 0 1 .7-.28Z"/></svg>
      </button>

      <div v-if="showProgressControl" aria-hidden="true" class="pointer-events-none absolute left-2 right-2 bottom-0 h-1 rounded-full bg-[var(--story-controls-divider)] overflow-hidden" data-story-controls-progress>
        <div class="h-full" :style="{ width: progressPercent + '%', background: 'var(--story-controls-progress, var(--brand-primary, #007c7e))', transition: 'width 280ms ease' }" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="reactionParticles.length" class="story-controls-reaction-particles" aria-hidden="true">
        <span
          v-for="particle in reactionParticles"
          :key="particle.id"
          class="story-controls-reaction-particle"
          :style="{
            '--particle-x': particle.x + 'px',
            '--particle-y': particle.y + 'px',
            '--particle-dx': particle.dx + 'px',
            '--particle-dy': particle.dy + 'px',
            '--particle-size': particle.size + 'px',
            '--particle-rotate': particle.rotate + 'deg',
            '--particle-duration': particle.duration + 'ms',
          }"
        >
          <span class="story-controls-reaction-particle__chip" />
          <svg class="story-controls-reaction-particle__glyph" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M8.5 11.3 6.2 8.9a1.55 1.55 0 0 1 2.2-2.18l2.28 2.28" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M11.2 9.7 8.35 6.85a1.55 1.55 0 1 1 2.2-2.18l3.55 3.55" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M14.05 8.17 11.8 5.92a1.48 1.48 0 0 1 2.1-2.1l3.75 3.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M17.5 10.6 16 9.1a1.43 1.43 0 0 1 2.02-2.02l1.88 1.88c1.84 1.84 1.84 4.82 0 6.66l-1.46 1.46a6.2 6.2 0 0 1-8.78 0L5.65 13.1a1.5 1.5 0 0 1 2.12-2.12l2.14 2.14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5.4 4.2 3.8 2.6M3.7 8.4H1.5M8.5 3.4V1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </span>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.story-controls-shell {
  background: color-mix(in srgb, var(--story-controls-bg, #ffffff) 95%, transparent);
  color: var(--story-controls-text, #111111);
}

.story-controls-btn,
.story-controls-reaction__icon,
.story-controls-reaction__count {
  color: var(--story-controls-text, #111111);
}

.story-controls-mobile-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  min-width: min(320px, calc(100vw - 32px));
  padding: 0 20px;
  border-radius: 999px;
  background: var(--story-mobile-cta-bg, var(--story-cta-bg, var(--brand-primary, #007c7e)));
  color: var(--story-mobile-cta-text, var(--story-cta-text, #ffffff));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
}

.story-controls-shell--minimal,
.story-controls-shell--pill,
.story-controls-shell--arrows {
  padding: 4px;
}

.story-controls-shell--pill,
.story-controls-shell--arrows {
  gap: 0;
}

.story-controls-shell--no-progress {
  overflow: visible;
}

.story-controls-shell--minimal .story-controls-btn,
.story-controls-shell--pill .story-controls-btn,
.story-controls-shell--arrows .story-controls-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
}

.story-controls-reaction {
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--story-controls-text, #111111) 14%, transparent);
  background: color-mix(in srgb, var(--story-controls-bg, #ffffff) 92%, #ffffff 8%);
}

.story-controls-reaction:hover {
  background: color-mix(in srgb, var(--story-controls-text, #111111) 8%, var(--story-controls-bg, #ffffff));
}

.story-controls-reaction__icon {
  flex: 0 0 auto;
  width: 1.125rem;
  height: 1.125rem;
}

.story-controls-reaction__count {
  min-width: 0.65em;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
}

.story-controls-divider {
  display: block;
}

.story-controls-shell--pill .story-controls-divider,
.story-controls-shell--arrows .story-controls-divider {
  height: 20px;
  margin-inline: 0;
}

.story-controls-btn:hover {
  background: color-mix(in srgb, var(--story-controls-text, #111111) 10%, transparent);
}

.story-controls-btn:active {
  background: color-mix(in srgb, var(--story-controls-text, #111111) 16%, transparent);
}

.story-controls-btn:disabled {
  opacity: var(--story-controls-disabled-opacity, 0.4) !important;
}

.story-controls-reaction-particles {
  position: fixed;
  inset: 0;
  z-index: 1200;
  pointer-events: none;
}

.story-controls-reaction-particle {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--particle-size, 18px);
  height: var(--particle-size, 18px);
  color: var(--story-reaction-particle-color, var(--story-controls-progress, var(--brand-primary, #007c7e)));
  transform: translate(var(--particle-x, 0), var(--particle-y, 0)) rotate(var(--particle-rotate, 0));
  animation: storyControlsReactionBurst var(--particle-duration, 900ms) cubic-bezier(0.18, 0.82, 0.28, 1) forwards;
}

.story-controls-reaction-particle__chip {
  position: absolute;
  inset: -4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--story-controls-bg, #ffffff) 94%, #ffffff 6%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.story-controls-reaction-particle__glyph {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

@keyframes storyControlsReactionBurst {
  0% {
    opacity: 0;
    transform: translate(var(--particle-x, 0), var(--particle-y, 0)) scale(0.65) rotate(var(--particle-rotate, 0));
  }

  12% {
    opacity: 1;
  }

  70% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform:
      translate(
        calc(var(--particle-x, 0) + var(--particle-dx, 0)),
        calc(var(--particle-y, 0) + var(--particle-dy, -180px))
      )
      scale(1.08)
      rotate(calc(var(--particle-rotate, 0) + 24deg));
  }
}

@media (prefers-reduced-motion: reduce) {
  .story-controls-reaction-particle {
    animation-duration: 1ms;
  }
}
</style>
