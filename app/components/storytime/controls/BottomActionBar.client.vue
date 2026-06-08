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
import { ref, onMounted, onBeforeUnmount, computed, toRaw, unref, watch } from 'vue'
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
  isPlaying?: { value: boolean }
  isMuted?: { value: boolean }
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
  </div>
</template>

<style scoped>
.story-controls-shell {
  background: var(--story-controls-bg, rgba(255, 255, 255, 0.95));
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
</style>
