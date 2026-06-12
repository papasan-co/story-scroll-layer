<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  StoryPresentation,
  StoryTimedPathChapter,
  StoryTimedPathDirection,
  StoryTimedPathExploreMoreTarget,
  StoryTimedPathMedia,
  StoryTimedPathPresentation,
  StoryTimedPathStep,
} from '../../types/storytime/scenes'
import {
  buildTimedPathSceneGroups,
  buildTimedPathSequence,
  isTimedPathChoiceStep,
  normalizeTimedPathPresentation,
  resolveTimedPathChapterTarget,
  timedPathStepSceneKey,
} from '../../utils/storytime/timedPath'
import { normalizeStoryPresentation } from '../../utils/storytime/presentation'

declare global {
  interface Window {
    __AUTUMN_TRACKING__?: {
      startScene?: (sceneId: string, sceneIndex: number, direction?: 'forward' | 'backward') => void
    }
  }
}

const props = withDefaults(defineProps<{
  presentation?: StoryPresentation | null
  timedPath?: StoryTimedPathPresentation | null
  controls?: boolean
  themeVars?: Record<string, string> | null
  lockBodyScroll?: boolean
}>(), {
  presentation: null,
  timedPath: null,
  controls: true,
  themeVars: null,
  lockBodyScroll: true,
})

const emit = defineEmits<{
  stepChange: [step: StoryTimedPathStep, position: number]
  pathChange: [pathKey: string | null]
  complete: []
}>()

const rootRef = ref<HTMLElement | null>(null)
const activeStepIndex = ref(0)
const selectedPath = ref<string | null>(null)
const timerProgress = ref(0)
const isPaused = ref(false)
const showPausedBadge = ref(false)
const showChapterMenu = ref(false)
const pointerStartedAt = ref(0)
const pointerStartX = ref(0)
const pointerStartY = ref(0)
const lastDirection = ref<StoryTimedPathDirection>('forward')
let timerRaf = 0
let timerStartedAt = 0
let pauseTimer: ReturnType<typeof setTimeout> | null = null

const normalizedPresentation = computed(() => normalizeStoryPresentation(props.presentation))
const normalizedTimedPath = computed(() => normalizeTimedPathPresentation(props.timedPath || normalizedPresentation.value.timedPath))
const steps = computed(() => normalizedTimedPath.value.steps || [])
const pathDefs = computed(() => normalizedTimedPath.value.paths || {})
const choiceStepType = computed(() => normalizedTimedPath.value.choiceStepType || 'choice')
const timedPathControls = computed(() => normalizedTimedPath.value.controls || {})
const keyboardEnabled = computed(() => timedPathControls.value.keyboard !== false)
const tapZonesEnabled = computed(() => timedPathControls.value.tapZones !== false)
const pauseOnHoldEnabled = computed(() => timedPathControls.value.pauseOnHold !== false)
const swipeEnabled = computed(() => timedPathControls.value.swipe === true)
const showProgress = computed(() => props.controls && timedPathControls.value.showProgress !== false)
const showLocation = computed(() => props.controls && timedPathControls.value.showLocation !== false)
const showChapters = computed(() => props.controls && timedPathControls.value.showChapterMenu !== false)
const controlMode = computed(() => timedPathControls.value.controlMode || 'bottom-bar')
const chapterMenuMode = computed(() => timedPathControls.value.chapterMenuMode || 'floating-list')
const chapterMenuTitle = computed(() => timedPathControls.value.chapterMenuTitle || 'Chapters')
const showTopControls = computed(() => props.controls && controlMode.value === 'top-icons')
const showBottomControls = computed(() => props.controls && controlMode.value === 'bottom-bar')
const showStepDots = computed(() => props.controls && timedPathControls.value.showStepDots === true)
const clearPathOnBackToChoice = computed(() => timedPathControls.value.clearPathOnBackToChoice !== false)

const activeStepSequence = computed(() => buildTimedPathSequence(
  steps.value,
  pathDefs.value,
  selectedPath.value,
  choiceStepType.value,
))
const positionInSequence = computed(() => activeStepSequence.value.indexOf(activeStepIndex.value))
const activeStep = computed(() => steps.value[activeStepIndex.value] || steps.value[activeStepSequence.value[0]] || steps.value[0])
const activeSceneKey = computed(() => activeStep.value ? timedPathStepSceneKey(activeStep.value) : '')
const sceneGroups = computed(() => buildTimedPathSceneGroups(steps.value, activeStepSequence.value))
const currentSceneGroup = computed(() => {
  const key = activeSceneKey.value
  const group = sceneGroups.value.find(candidate => candidate.key === key)
  if (!group) return { key, label: activeStep.value?.sceneLabel || key, positions: [] }
  return group
})
const localSceneIndex = computed(() => {
  const position = positionInSequence.value
  const index = currentSceneGroup.value.positions.indexOf(position)
  return Math.max(0, index)
})
const sceneHasMultipleSteps = computed(() => currentSceneGroup.value.positions.length > 1 && !isChoiceStep.value)
const canGoPrevious = computed(() => positionInSequence.value > 0)
const canGoNext = computed(() => positionInSequence.value >= 0 && positionInSequence.value < activeStepSequence.value.length - 1)
const chapters = computed<StoryTimedPathChapter[]>(() => normalizedTimedPath.value.chapters || [])
const allSceneGroups = computed(() =>
  buildTimedPathSceneGroups(steps.value, steps.value.map((_, index) => index)),
)
const exploreMoreTargets = computed<StoryTimedPathExploreMoreTarget[]>(() => {
  if (!selectedPath.value) return []

  const activeSceneKeys = new Set(sceneGroups.value.map(group => group.key))
  return allSceneGroups.value
    .filter(group => !activeSceneKeys.has(group.key))
    .map(group => ({
      key: group.key,
      label: group.label,
      positions: group.positions,
    }))
})
const activeMediaBackground = computed(() => {
  const media = activeStep.value?.media
  if (!media) return ''
  return media.background || media.backgroundColor || media.color || media.value || ''
})
const rootStyle = computed(() => {
  const base = props.themeVars || {}
  if (!activeMediaBackground.value) return Object.keys(base).length ? base : undefined
  return {
    ...base,
    '--story-active-media-bg': activeMediaBackground.value,
  }
})
const stepDuration = computed(() => {
  const duration = activeStep.value?.durationMs
  return typeof duration === 'number' && Number.isFinite(duration) ? Math.max(0, duration) : 0
})
const isChoiceStep = computed(() => isTimedPathChoiceStep(activeStep.value, choiceStepType.value))

const mediaStyle = computed(() => {
  const media = activeStep.value?.media
  if (!media) return undefined
  const background = media.background || media.backgroundColor || media.color || media.value
  if (media.kind === 'color') return { background: background || '#000000' }
  if (media.kind === 'gradient') return { background: background || '#000000' }
  if (background) return { background }
  return undefined
})

const mediaOverlayStyle = computed(() => {
  const overlay = activeStep.value?.media?.overlay
  if (typeof overlay !== 'string' || !overlay.trim()) return undefined
  return { background: overlay.trim() }
})

function mediaSource(media: StoryTimedPathMedia | null | undefined): string {
  if (!media) return ''
  return mediaUrlFromValue(media.src) || mediaUrlFromValue(media.url) || mediaUrlFromValue(media)
}

function mediaUrlFromValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''

  const node = value as Record<string, unknown>
  for (const key of ['directUrl', 'src', 'url', 's3Key', 'key']) {
    const candidate = node[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }

  return ''
}

function setActiveStep(index: number) {
  if (!steps.value[index]) return
  activeStepIndex.value = index
}

function advance() {
  const position = positionInSequence.value
  if (position < 0) return
  if (position < activeStepSequence.value.length - 1) {
    lastDirection.value = 'forward'
    setActiveStep(activeStepSequence.value[position + 1])
    return
  }

  emit('complete')
}

function goBack() {
  const position = positionInSequence.value
  if (position <= 0) return

  const previousIndex = activeStepSequence.value[position - 1]
  lastDirection.value = 'back'
  if (clearPathOnBackToChoice.value && isTimedPathChoiceStep(steps.value[previousIndex], choiceStepType.value)) {
    selectedPath.value = null
    emit('pathChange', null)
  }

  setActiveStep(previousIndex)
}

function choosePath(pathKey: string) {
  selectedPath.value = pathKey
  emit('pathChange', pathKey)
  nextTick(() => advance())
}

function jumpToChapter(chapter: StoryTimedPathChapter) {
  const target = resolveTimedPathChapterTarget(chapter, steps.value, activeStepSequence.value)
  if (target === null) {
    const fallbackSceneKey = chapter.sceneKeys?.[0] || chapter.key
    jumpToScene(fallbackSceneKey)
    return
  }

  const targetPosition = activeStepSequence.value.indexOf(target)
  lastDirection.value = targetPosition < positionInSequence.value ? 'back' : 'forward'
  setActiveStep(target)
  showChapterMenu.value = false
  isPaused.value = false
}

function jumpToScene(sceneKey: string) {
  if (!sceneKey) return

  let sequence = activeStepSequence.value
  let target = sequence.find(index => timedPathStepSceneKey(steps.value[index]) === sceneKey)

  if (target === undefined) {
    const nextPath = Object.entries(pathDefs.value)
      .find(([, sceneKeys]) => Array.isArray(sceneKeys) && sceneKeys.includes(sceneKey))?.[0]

    if (nextPath) {
      selectedPath.value = nextPath
      emit('pathChange', nextPath)
      sequence = buildTimedPathSequence(steps.value, pathDefs.value, nextPath, choiceStepType.value)
      target = sequence.find(index => timedPathStepSceneKey(steps.value[index]) === sceneKey)
    }
  }

  if (target === undefined) return

  const targetPosition = sequence.indexOf(target)
  lastDirection.value = targetPosition < positionInSequence.value ? 'back' : 'forward'
  setActiveStep(target)
  showChapterMenu.value = false
  isPaused.value = false
}

function segmentFill(groupIndex: number) {
  const group = sceneGroups.value[groupIndex]
  if (!group) return 0

  const position = positionInSequence.value
  const first = group.positions[0]
  const last = group.positions[group.positions.length - 1]
  if (position < first) return 0
  if (position > last) return 1

  const local = position - first
  const fraction = 1 / group.positions.length
  return local * fraction + timerProgress.value * fraction
}

function cancelTimer() {
  if (timerRaf) window.cancelAnimationFrame(timerRaf)
  timerRaf = 0
}

function startTimer() {
  cancelTimer()
  timerProgress.value = 0

  if (!stepDuration.value) return
  timerStartedAt = performance.now()

  const tick = (now: number) => {
    if (isPaused.value || showChapterMenu.value) {
      timerStartedAt = now - timerProgress.value * stepDuration.value
      timerRaf = window.requestAnimationFrame(tick)
      return
    }

    timerProgress.value = Math.min((now - timerStartedAt) / stepDuration.value, 1)
    if (timerProgress.value >= 1) {
      advance()
      return
    }

    timerRaf = window.requestAnimationFrame(tick)
  }

  timerRaf = window.requestAnimationFrame(tick)
}

function onKeydown(event: KeyboardEvent) {
  if (!keyboardEnabled.value) return
  if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    advance()
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goBack()
  }
}

function onPointerDown(event: PointerEvent) {
  if (!tapZonesEnabled.value && !pauseOnHoldEnabled.value && !swipeEnabled.value) return
  if ((event.target as HTMLElement).closest('a, button, [data-story-timed-path-menu]')) return

  pointerStartedAt.value = Date.now()
  pointerStartX.value = event.clientX
  pointerStartY.value = event.clientY

  if (!pauseOnHoldEnabled.value) return
  isPaused.value = true
  showPausedBadge.value = false
  if (pauseTimer) clearTimeout(pauseTimer)
  pauseTimer = setTimeout(() => {
    if (isPaused.value) showPausedBadge.value = true
  }, 500)
}

function onPointerUp(event: PointerEvent) {
  if ((event.target as HTMLElement).closest('a, button, [data-story-timed-path-menu]')) return

  const elapsed = Date.now() - pointerStartedAt.value
  const deltaX = event.clientX - pointerStartX.value
  const deltaY = event.clientY - pointerStartY.value

  if (pauseOnHoldEnabled.value) {
    isPaused.value = false
    showPausedBadge.value = false
    if (pauseTimer) {
      clearTimeout(pauseTimer)
      pauseTimer = null
    }
  }

  if (swipeEnabled.value && Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
    if (deltaX < 0) advance()
    else goBack()
    return
  }

  if (!tapZonesEnabled.value || elapsed >= 280) return
  const reverseZone = window.innerWidth * 0.25
  if (event.clientX < reverseZone) goBack()
  else if (!isChoiceStep.value) advance()
}

function storyControl(action: StoryTimedPathDirection | 'pause' | 'play' | 'chapters') {
  if (action === 'forward') advance()
  if (action === 'back') goBack()
  if (action === 'pause') isPaused.value = true
  if (action === 'play') isPaused.value = false
  if (action === 'chapters') {
    showChapterMenu.value = !showChapterMenu.value
    isPaused.value = showChapterMenu.value
  }
}

function chapterSceneKeys(chapter: StoryTimedPathChapter): string[] {
  return Array.isArray(chapter.sceneKeys) && chapter.sceneKeys.length ? chapter.sceneKeys : [chapter.key]
}

function chapterIsActive(chapter: StoryTimedPathChapter): boolean {
  return chapterSceneKeys(chapter).includes(activeSceneKey.value)
}

function chapterStepCount(chapter: StoryTimedPathChapter): number {
  const sceneKeys = new Set(chapterSceneKeys(chapter))
  return allSceneGroups.value
    .filter(group => sceneKeys.has(group.key))
    .reduce((count, group) => count + group.positions.length, 0)
}

function notifyTrackerOfActiveStep() {
  if (typeof window === 'undefined') return
  const step = activeStep.value
  if (!step) return

  const sceneId = step.id || step.key
  const sceneIndex = positionInSequence.value
  if (!sceneId || sceneIndex < 0) return

  window.__AUTUMN_TRACKING__?.startScene?.(
    sceneId,
    sceneIndex,
    lastDirection.value === 'back' ? 'backward' : 'forward',
  )
}

watch(activeStepIndex, () => {
  const step = activeStep.value
  if (step) emit('stepChange', step, positionInSequence.value)
  notifyTrackerOfActiveStep()
  nextTick(() => {
    rootRef.value?.focus({ preventScroll: true })
    startTimer()
  })
})

watch(stepDuration, () => {
  nextTick(() => startTimer())
})

onMounted(() => {
  if (props.lockBodyScroll) {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }

  rootRef.value?.focus()
  notifyTrackerOfActiveStep()
  startTimer()
})

onBeforeUnmount(() => {
  cancelTimer()
  if (pauseTimer) clearTimeout(pauseTimer)
  if (props.lockBodyScroll) {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }
})
</script>

<template>
  <div
    ref="rootRef"
    class="story-timed-path-root"
    tabindex="0"
    :style="rootStyle"
    data-au-flow-mode="timed-path"
    :data-story-timed-path-layout="activeStep?.layout || 'full'"
    :data-story-timed-path-media-kind="activeStep?.media?.kind || ''"
    :data-story-timed-path-media-fit="activeStep?.media?.fit || ''"
    @keydown="onKeydown"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <div class="story-timed-path-bg" :style="mediaStyle" data-story-timed-path-bg aria-hidden="true">
      <template v-if="activeStep?.media?.kind === 'image'">
        <img
          class="story-timed-path-bg__media"
          :src="mediaSource(activeStep.media)"
          :alt="activeStep.media.alt || ''"
          :style="{ objectFit: activeStep.media.fit || 'cover', objectPosition: activeStep.media.position || 'center center' }"
        >
      </template>
      <template v-else-if="activeStep?.media?.kind === 'video'">
        <video
          class="story-timed-path-bg__media"
          :src="mediaSource(activeStep.media)"
          :muted="activeStep.media.muted !== false"
          :loop="activeStep.media.loop !== false"
          :autoplay="activeStep.media.autoplay !== false"
          :playsinline="activeStep.media.playsInline !== false"
          :style="{ objectFit: activeStep.media.fit || 'cover', objectPosition: activeStep.media.position || 'center center' }"
        />
      </template>
      <span
        v-if="mediaOverlayStyle"
        class="story-timed-path-bg__overlay"
        :style="mediaOverlayStyle"
      />
      <slot name="background" :step="activeStep" :position="positionInSequence" :timer-progress="timerProgress" />
    </div>

    <div
      v-if="showProgress || showLocation || showTopControls"
      class="story-timed-path-topbar"
      data-story-timed-path-topbar
    >
      <div v-if="showProgress" class="story-timed-path-progress" data-story-timed-path-progress>
        <button
          v-for="(group, index) in sceneGroups"
          :key="group.key"
          type="button"
          class="story-timed-path-progress__segment"
          data-au-track="story-control"
          data-au-modifier="chapter-jump"
          :data-au-label="group.label"
          @click.stop="setActiveStep(activeStepSequence[group.positions[0]])"
        >
          <span class="story-timed-path-progress__label">{{ group.label }}</span>
          <span class="story-timed-path-progress__track">
            <span class="story-timed-path-progress__fill" :style="{ width: `${segmentFill(index) * 100}%` }" />
          </span>
        </button>
      </div>

      <div class="story-timed-path-topbar__row">
        <div v-if="showLocation" class="story-timed-path-location" data-story-timed-path-location>
          <span class="story-timed-path-location__title">{{ currentSceneGroup.label }}</span>
          <span v-if="currentSceneGroup.positions.length > 1" class="story-timed-path-location__counter">
            · {{ localSceneIndex + 1 }} of {{ currentSceneGroup.positions.length }}
          </span>
        </div>

        <div v-if="showTopControls" class="story-timed-path-icon-controls" data-story-timed-path-controls>
          <button
            type="button"
            data-au-track="story-control"
            :data-au-modifier="isPaused ? 'play' : 'pause'"
            :aria-label="isPaused ? 'Play' : 'Pause'"
            @click.stop="storyControl(isPaused ? 'play' : 'pause')"
          >
            <svg v-if="isPaused" class="story-timed-path-control-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else class="story-timed-path-control-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
          <button
            v-if="showChapters && chapters.length"
            type="button"
            data-au-track="story-control"
            data-au-modifier="chapters"
            aria-label="Chapters"
            @click.stop="storyControl('chapters')"
          >
            <svg class="story-timed-path-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <section
      v-if="activeStep"
      class="story-timed-path-step"
      :class="activeStep.layout === 'split' ? 'story-timed-path-step--split' : 'story-timed-path-step--full'"
      :data-au-scene-id="activeStep.id || activeStep.key"
      :data-au-scene-index="positionInSequence"
      :data-au-source-key="activeStep.sourceKey"
      :data-au-step-key="activeStep.key"
      :data-au-scene-flow="'timed-path'"
      :data-story-timed-path-step="activeStep.type"
    >
      <slot
        name="visual"
        :scene="activeStep"
        :step="positionInSequence"
        :path-step="activeStep"
        :step-index="activeStepIndex"
        :position="positionInSequence"
        :timer-progress="timerProgress"
        :active="true"
        :selected-path="selectedPath"
        :choose-path="choosePath"
        :jump-to-scene="jumpToScene"
        :explore-more="exploreMoreTargets"
      >
        <div class="story-timed-path-card">
          <p v-if="activeStep.pre" class="story-timed-path-card__pre">{{ activeStep.pre }}</p>
          <h1 v-if="activeStep.title" class="story-timed-path-card__title" v-html="activeStep.title" />
          <p v-if="activeStep.body" class="story-timed-path-card__body" v-html="activeStep.body" />
          <div v-if="activeStep.choices?.length" class="story-timed-path-card__choices">
            <button
              v-for="choice in activeStep.choices"
              :key="choice.key"
              type="button"
              class="story-timed-path-card__choice"
              data-au-track="story-control"
              :data-au-label="choice.trackLabel || choice.label"
              :data-au-modifier="choice.trackModifier || `path:${choice.pathKey || choice.key}`"
              @click.stop="choosePath(choice.pathKey || choice.key)"
            >
              <span>{{ choice.label }}</span>
              <small v-if="choice.description">{{ choice.description }}</small>
            </button>
          </div>
        </div>
      </slot>
    </section>

    <div
      v-if="showStepDots && sceneHasMultipleSteps"
      class="story-timed-path-step-dots"
      data-story-timed-path-step-dots
      aria-hidden="true"
    >
      <span
        v-for="(_, index) in currentSceneGroup.positions"
        :key="`${currentSceneGroup.key}-${index}`"
        class="story-timed-path-step-dot"
        :class="{
          'story-timed-path-step-dot--active': index === localSceneIndex,
          'story-timed-path-step-dot--past': index < localSceneIndex,
        }"
      />
    </div>

    <div v-if="showBottomControls" class="story-timed-path-controls" data-story-timed-path-controls>
      <button
        type="button"
        :disabled="!canGoPrevious"
        data-au-track="story-control"
        data-au-modifier="previous"
        aria-label="Previous"
        @click.stop="storyControl('back')"
      >
        ‹
      </button>
      <button
        type="button"
        data-au-track="story-control"
        :data-au-modifier="isPaused ? 'play' : 'pause'"
        :aria-label="isPaused ? 'Play' : 'Pause'"
        @click.stop="storyControl(isPaused ? 'play' : 'pause')"
      >
        {{ isPaused ? 'Play' : 'Pause' }}
      </button>
      <button
        v-if="showChapters && chapters.length"
        type="button"
        data-au-track="story-control"
        data-au-modifier="chapters"
        aria-label="Chapters"
        @click.stop="storyControl('chapters')"
      >
        Chapters
      </button>
      <button
        type="button"
        :disabled="!canGoNext"
        data-au-track="story-control"
        data-au-modifier="next"
        aria-label="Next"
        @click.stop="storyControl('forward')"
      >
        ›
      </button>
    </div>

    <div
      v-if="showChapterMenu"
      class="story-timed-path-menu"
      :class="`story-timed-path-menu--${chapterMenuMode}`"
      data-story-timed-path-menu
      :data-story-timed-path-menu-mode="chapterMenuMode"
      @click.self.stop="storyControl('chapters')"
    >
      <div class="story-timed-path-menu__panel">
        <div v-if="chapterMenuMode === 'modal-list'" class="story-timed-path-menu__header">
          <h3 class="story-timed-path-menu__title">{{ chapterMenuTitle }}</h3>
          <button
            type="button"
            class="story-timed-path-menu__close"
            aria-label="Close chapters"
            @click.stop="storyControl('chapters')"
          >
            ✕
          </button>
        </div>
        <div class="story-timed-path-menu__list">
          <button
            v-for="chapter in chapters"
            :key="chapter.key"
            type="button"
            class="story-timed-path-menu__item"
            :class="{ 'story-timed-path-menu__item--active': chapterIsActive(chapter) }"
            data-au-track="story-control"
            data-au-modifier="chapter-jump"
            :data-au-label="chapter.label"
            @click.stop="jumpToChapter(chapter)"
          >
            <span v-if="chapterMenuMode === 'modal-list'" class="story-timed-path-menu__dot" :class="{ 'story-timed-path-menu__dot--active': chapterIsActive(chapter) }" />
            <span class="story-timed-path-menu__name">{{ chapter.label }}</span>
            <span v-if="chapterMenuMode === 'modal-list' && chapterStepCount(chapter) > 1" class="story-timed-path-menu__count">
              {{ chapterStepCount(chapter) }} slides
            </span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="showPausedBadge" class="story-timed-path-paused" aria-live="polite">Paused</div>
  </div>
</template>

<style scoped>
.story-timed-path-root {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--story-visual-bg, #020617);
  color: var(--story-visual-text, #ffffff);
  font-family: var(--story-font-body, system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
  user-select: none;
}

.story-timed-path-root:focus {
  outline: none;
}

.story-timed-path-bg,
.story-timed-path-bg__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.story-timed-path-bg__media {
  z-index: 0;
}

.story-timed-path-bg__overlay {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
}

.story-timed-path-topbar {
  position: absolute;
  z-index: 40;
  top: 0;
  left: 12px;
  right: 12px;
  padding-top: 10px;
  pointer-events: auto;
}

.story-timed-path-progress {
  display: flex;
  gap: 3px;
  margin-bottom: 6px;
}

.story-timed-path-progress__segment {
  flex: 1;
  display: flex;
  position: relative;
  align-items: center;
  border: 0;
  padding: 8px 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.story-timed-path-progress__label {
  position: absolute;
  top: calc(100% + 2px);
  left: 50%;
  z-index: 10;
  overflow: hidden;
  max-width: 220px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 5px;
  padding: 3px 8px;
  background: rgba(15, 23, 42, 0.9);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  text-overflow: ellipsis;
  white-space: nowrap;
  backdrop-filter: blur(6px);
}

.story-timed-path-progress__segment:hover .story-timed-path-progress__label {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.story-timed-path-progress__track {
  width: 100%;
  height: 3px;
  overflow: hidden;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
}

.story-timed-path-progress__segment:hover .story-timed-path-progress__track {
  height: 4px;
}

.story-timed-path-progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--story-accent, #fbbf24);
  transition: width 0.1s linear;
}

.story-timed-path-topbar__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 22px;
  padding: 0 2px;
}

.story-timed-path-location {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.story-timed-path-location__title {
  color: var(--story-accent, #fbbf24);
  font-weight: 600;
}

.story-timed-path-location__counter {
  color: rgba(255, 255, 255, 0.4);
}

.story-timed-path-icon-controls {
  display: flex;
  gap: 4px;
}

.story-timed-path-icon-controls button {
  display: flex;
  align-items: center;
  border: 0;
  border-radius: 6px;
  padding: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: background 0.15s ease;
}

.story-timed-path-icon-controls button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.story-timed-path-control-icon {
  width: 18px;
  height: 18px;
}

.story-timed-path-step {
  position: absolute;
  z-index: 10;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.story-timed-path-step :deep(a),
.story-timed-path-step :deep(button) {
  pointer-events: auto;
}

.story-timed-path-card {
  width: min(680px, calc(100vw - 48px));
  text-align: center;
}

.story-timed-path-card__pre {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.75;
}

.story-timed-path-card__title {
  margin: 0;
  font-size: clamp(32px, 6vw, 72px);
  line-height: 1.05;
}

.story-timed-path-card__body {
  margin: 20px auto 0;
  max-width: 560px;
  font-size: clamp(16px, 2vw, 22px);
  line-height: 1.55;
  opacity: 0.82;
}

.story-timed-path-card__choices {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}

.story-timed-path-card__choice {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
}

.story-timed-path-card__choice small {
  opacity: 0.7;
}

.story-timed-path-controls {
  position: absolute;
  z-index: 50;
  left: 50%;
  bottom: calc(22px + env(safe-area-inset-bottom, 0px));
  display: flex;
  gap: 8px;
  transform: translateX(-50%);
}

.story-timed-path-controls button,
.story-timed-path-menu__item {
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.72);
  color: inherit;
  cursor: pointer;
  backdrop-filter: blur(12px);
}

.story-timed-path-menu__item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.story-timed-path-menu__name {
  flex: 1;
}

.story-timed-path-menu__count {
  color: rgba(148, 163, 184, 0.58);
  font-size: 0.72rem;
  white-space: nowrap;
}

.story-timed-path-menu__dot {
  width: 8px;
  height: 8px;
  border: 1.5px solid rgba(148, 163, 184, 0.45);
  border-radius: 50%;
  flex-shrink: 0;
}

.story-timed-path-menu__dot--active {
  border-color: var(--story-accent, #fbbf24);
  background: var(--story-accent, #fbbf24);
}

.story-timed-path-controls button:disabled {
  opacity: 0.35;
  cursor: default;
}

.story-timed-path-step-dots {
  position: absolute;
  z-index: 40;
  left: 50%;
  bottom: 2.5rem;
  display: flex;
  gap: 8px;
  transform: translateX(-50%);
}

.story-timed-path-step-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(71, 85, 105, 0.5);
  transition: all 0.35s ease;
}

.story-timed-path-step-dot--active {
  background: var(--story-accent, #fbbf24);
  transform: scale(1.35);
}

.story-timed-path-step-dot--past {
  background: rgba(251, 191, 36, 0.35);
}

.story-timed-path-menu {
  position: absolute;
  z-index: 60;
  left: 50%;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  width: min(360px, calc(100vw - 32px));
  transform: translateX(-50%);
}

.story-timed-path-menu__panel,
.story-timed-path-menu__list {
  display: grid;
  gap: 8px;
}

.story-timed-path-menu__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.story-timed-path-menu__title {
  margin: 0;
  color: inherit;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.story-timed-path-menu__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  padding: 4px 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.62);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}

.story-timed-path-menu--modal-list {
  inset: 0;
  left: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: auto;
  background: rgba(0, 0, 0, 0.6);
  transform: none;
  backdrop-filter: blur(12px);
}

.story-timed-path-menu--modal-list .story-timed-path-menu__panel {
  width: 100%;
  max-width: 420px;
  max-height: 70vh;
  overflow-y: auto;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-bottom: 0;
  border-radius: 1rem 1rem 0 0;
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.95);
}

.story-timed-path-menu--modal-list .story-timed-path-menu__list {
  gap: 2px;
}

.story-timed-path-menu--modal-list .story-timed-path-menu__item {
  width: 100%;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.7rem 0.75rem;
  background: transparent;
  color: #ffffff;
  backdrop-filter: none;
}

.story-timed-path-menu--modal-list .story-timed-path-menu__item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.story-timed-path-menu--modal-list .story-timed-path-menu__item--active {
  background: rgba(251, 191, 36, 0.08);
}

.story-timed-path-paused {
  position: absolute;
  z-index: 70;
  top: 50%;
  left: 50%;
  border-radius: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  transform: translate(-50%, -50%);
}

@media (min-width: 1024px) {
  .story-timed-path-menu--modal-list {
    align-items: center;
  }

  .story-timed-path-menu--modal-list .story-timed-path-menu__panel {
    max-width: 480px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    border-radius: 1rem;
    padding: 1.5rem 2rem;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  }

  .story-timed-path-menu--modal-list .story-timed-path-menu__item {
    padding: 0.75rem 1rem;
  }

  .story-timed-path-step--split {
    justify-content: flex-end;
  }

  .story-timed-path-step--split .story-timed-path-card {
    width: 48vw;
    margin-right: 4vw;
    text-align: left;
  }
}

@media (max-width: 640px) {
  .story-timed-path-topbar {
    left: 8px;
    right: 8px;
    padding-top: 8px;
  }

  .story-timed-path-progress {
    gap: 2px;
    margin-bottom: 4px;
  }

  .story-timed-path-progress__segment {
    padding: 6px 0;
  }

  .story-timed-path-progress__track {
    height: 2px;
  }

  .story-timed-path-progress__label {
    display: none;
  }

  .story-timed-path-location {
    font-size: 0.65rem;
  }

  .story-timed-path-control-icon {
    width: 16px;
    height: 16px;
  }

  .story-timed-path-step-dots {
    bottom: 1.8rem;
    gap: 6px;
  }

  .story-timed-path-step-dot {
    width: 6px;
    height: 6px;
  }
}
</style>
