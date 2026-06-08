<script setup lang="ts">
import { reactive, computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type {
  StoryCardMode,
  StoryChapterNavPresentation,
  StoryControlsPresentation,
  StoryJumpAlign,
  StoryPresentation,
  StoryScene,
} from '../../types/storytime/scenes'
import { useStepStructure } from '../../composables/storytime/useStepStructure'
import { useIoScroller } from '../../composables/storytime/useIoScroller'
import { useCssVarScroll } from '../../composables/storytime/useCssVarScroll'
import { normalizeStoryPresentation } from '../../utils/storytime/presentation'

import ScrollVisual from './blocks/ScrollVisual.vue'
import ArticleStep from './blocks/ArticleStep.vue'
import ArticleCopy from './blocks/ArticleCopy.vue'
import ArticleCTA from './blocks/ArticleCTA.vue'
import ArticleMediaCaption from './blocks/ArticleMediaCaption.vue'
import BottomActionBar from './controls/BottomActionBar.client.vue'
import StoryChapterNav from './StoryChapterNav.vue'

const props = withDefaults(defineProps<{
  scenes: StoryScene[]
  /**
   * Enable/disable the bottom controls.
   */
  controls?: boolean
  /**
   * Optional brand color for progress bar / theming.
   */
  brandColor?: string
  /**
   * Use an internal scroll panel for the article column (preview/editor mode).
   */
  panelScroll?: boolean
  /**
   * Optional CSS variables resolved by host (story/scene brand theming).
   */
  themeVars?: Record<string, string> | null
  presentation?: StoryPresentation | null
  disableChromeTeleport?: boolean
}>(), {
  controls: true,
  brandColor: '#007c7e',
  panelScroll: false,
  themeVars: null,
  presentation: null,
  disableChromeTeleport: false,
})

const scrollyRootRef = ref<HTMLElement | null>(null)
const stepsRootRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(typeof window === 'undefined' ? 0 : window.innerWidth)
const activeSceneProgress = ref(0)

const effectivePanelScroll = computed(() => !!props.panelScroll)

function isStandaloneIntroScene(scene: StoryScene | undefined): boolean {
  return scene?.flow === 'standalone'
}

const standaloneIntroCount = computed(() => {
  let count = 0
  for (const scene of props.scenes) {
    if (!isStandaloneIntroScene(scene)) break
    count += 1
  }
  return count
})
const standaloneIntroScenes = computed(() => props.scenes.slice(0, standaloneIntroCount.value))
const scrollyScenes = computed(() => props.scenes.slice(standaloneIntroCount.value))
const standaloneIntroSceneRefs: HTMLElement[] = []
const activeStandaloneIntroIndex = ref<number | null>(standaloneIntroScenes.value.length ? 0 : null)
const standaloneIntroProgressByIndex = ref<Record<number, number>>({})

const flatSteps = computed(() => useStepStructure(scrollyScenes.value))
const visualRefs = reactive<Record<string, any>>({})
const normalizedPresentation = computed(() => normalizeStoryPresentation(props.presentation))
const scrollPresentation = computed(() => normalizedPresentation.value.scroll || {})
const defaultJumpTarget = computed(() => scrollPresentation.value.jumpTarget === 'card' ? 'card' : 'step')
const activationMode = computed(() => {
  const mode = scrollPresentation.value.activationMode
  return mode === 'card-center' || mode === 'card-exit-next' ? mode : 'step-exit'
})
const activationAnchor = computed(() => {
  const value = scrollPresentation.value.activationAnchor
  return typeof value === 'number' && Number.isFinite(value) ? value : 0.7
})
const activationHysteresisPx = computed(() => {
  const value = scrollPresentation.value.activationHysteresisPx
  return typeof value === 'number' && Number.isFinite(value) ? value : 24
})
const introExitTarget = computed(() => {
  return scrollPresentation.value.introExitTarget === 'scrolly-start' ? 'scrolly-start' : 'step-target'
})
const introExitDurationMs = computed(() => {
  const value = scrollPresentation.value.introExitDurationMs
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(4000, value))
    : 0
})
const introReturnDurationMs = computed(() => {
  const value = scrollPresentation.value.introReturnDurationMs
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(4000, value))
  }

  return introExitDurationMs.value
})
const disableSnap = computed(() => effectivePanelScroll.value || scrollPresentation.value.disableSnap === true)

function isStoryCardMode(value: unknown): value is StoryCardMode {
  return value === 'side-by-side' || value === 'overlay' || value === 'viewport-stack' || value === 'hidden'
}

function sceneResponsiveBreakpoint(scene?: StoryScene) {
  const value = scene?.responsiveBreakpoint
  return typeof value === 'number' && Number.isFinite(value) ? value : 1024
}

function baseSceneCardMode(scene?: StoryScene): StoryCardMode {
  if (isStoryCardMode(scene?.cardMode)) return scene.cardMode
  return scene?.layout === 'full' ? 'hidden' : 'side-by-side'
}

function sceneCardMode(scene?: StoryScene): StoryCardMode {
  if (!scene) return 'side-by-side'
  if (
    viewportWidth.value > 0 &&
    viewportWidth.value <= sceneResponsiveBreakpoint(scene) &&
    isStoryCardMode(scene.responsiveCardMode)
  ) {
    return scene.responsiveCardMode
  }

  return baseSceneCardMode(scene)
}

const forceViewportCardStack = computed(() => scrollyScenes.value.some(scene => sceneCardMode(scene) === 'viewport-stack'))

const { activeStep, stepsReady, getStepTargetIndex, resolveVisibleStepIndex, scrollToStepIndex } = useIoScroller(flatSteps.value, scrollyScenes.value, visualRefs, {
  stepsRoot: stepsRootRef,
  stepSelector: '.step',
  scrollRoot: effectivePanelScroll.value ? stepsRootRef : null,
  disableSnap,
  forceMobileSpacing: forceViewportCardStack,
  scrollTarget: defaultJumpTarget,
  activationMode,
  activationAnchor,
  activationHysteresisPx,
})

useCssVarScroll(scrollyRootRef)

const activeScene = computed(() => {
  const step = flatSteps.value[activeStep.value]
  if (!step) return scrollyScenes.value[0] || standaloneIntroScenes.value[0] || props.scenes[0]
  return scrollyScenes.value[step.sceneIdx]
})

const activeStandaloneIntroScene = computed(() => {
  const index = activeStandaloneIntroIndex.value
  return typeof index === 'number' ? standaloneIntroScenes.value[index] : null
})
const activeNavScene = computed(() => activeStandaloneIntroScene.value || activeScene.value)

const activeVisualRef = computed(() => {
  const scene = activeNavScene.value
  return visualRefs[scene?.key]
})

const isFullLayout = computed(() => activeScene.value?.layout === 'full')
const activeCardMode = computed(() => sceneCardMode(activeScene.value))
const activeCardAlign = computed(() => activeScene.value?.cardAlign ?? 'right')
const presentationChapters = computed(() => normalizedPresentation.value.chapters || [])
const presentationNavMode = computed(() => String(normalizedPresentation.value.navMode || ''))
const showChapterNav = computed(() => {
  if (!presentationChapters.value.length) return false
  const mode = presentationNavMode.value
  return !mode || mode === 'chapter-nav' || mode === 'both' || mode.split(/\s+/).includes('chapter-nav')
})
const activeNavSceneKey = computed(() => activeNavScene.value?.sourceKey || activeNavScene.value?.key || '')
const chapterNavPresentation = computed(() => normalizedPresentation.value.chapterNav || {})
const chapterNavChromeMode = computed(() => chapterNavPresentation.value.chromeMode === 'floating-rail' ? 'floating-rail' : 'default')
const chapterNavShowToggle = computed(() => chapterNavPresentation.value.showToggle !== false)
const chapterNavInactiveLabel = computed(() => {
  const label = chapterNavPresentation.value.inactiveLabel
  return typeof label === 'string' && label.trim() ? label.trim() : ''
})
const chapterNavInactiveBehavior = computed(() => {
  return chapterNavPresentation.value.inactiveBehavior === 'first-chapter' ? 'first-chapter' : 'none'
})
const chapterNavBrand = computed(() => chapterNavPresentation.value.brand || null)
const chapterNavBrandMode = computed(() => {
  const value = chapterNavPresentation.value.brandMode
  return value === 'text' || value === 'image' || value === 'mark' || value === 'none' ? value : undefined
})
const chapterNavCta = computed(() => chapterNavPresentation.value.cta || null)
const chapterNavJumpAlign = computed(() => resolveJumpAlign(chapterNavPresentation.value))
const chapterNavJumpEndOffsetPx = computed(() => resolveJumpEndOffsetPx(chapterNavPresentation.value))
const chapterNavJumpTarget = computed(() => {
  return chapterNavPresentation.value.jumpTarget === 'card' ? 'card' : defaultJumpTarget.value
})
const chapterNavDarkSceneKeys = computed(() => {
  const sceneKeys = chapterNavPresentation.value.darkSceneKeys
  return Array.isArray(sceneKeys)
    ? sceneKeys.filter((key): key is string => typeof key === 'string' && key.length > 0)
    : []
})
const chapterNavBrandLabel = computed(() => {
  const presentation = normalizedPresentation.value as Record<string, any> | null
  return presentation?.brandLabel || presentation?.navBrandLabel || ''
})
const chapterNavAriaLabel = computed(() => {
  const presentation = normalizedPresentation.value as Record<string, any> | null
  return presentation?.navAriaLabel || 'Story chapters'
})
const controlsPresentation = computed(() => normalizedPresentation.value.controls || {})
const controlsMode = computed(() => controlsPresentation.value.controlMode || 'default')
const controlsShowShare = computed(() => controlsPresentation.value.showShare !== false)
const controlsShowProgress = computed(() => controlsPresentation.value.showProgress !== false)
const controlsShowVideoControls = computed(() => controlsPresentation.value.showVideoControls !== false)
const controlsKeyboard = computed(() => controlsPresentation.value.keyboard !== false)
const controlsHideOnMobileBelow = computed(() => {
  const value = controlsPresentation.value.hideOnMobileBelow
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
})
const controlsAutoHideOnMobile = computed(() => controlsPresentation.value.autoHideOnMobile !== false)
const controlsBottomOffsetPx = computed(() => {
  const value = controlsPresentation.value.bottomOffsetPx
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
})
const controlsResponsiveBottomOffsetPx = computed(() => {
  const value = controlsPresentation.value.responsiveBottomOffsetPx
  return Array.isArray(value) ? value : undefined
})
const controlsMobileCta = computed(() => controlsPresentation.value.mobileCta || null)
const controlsJumpAlign = computed(() => resolveJumpAlign(controlsPresentation.value))
const controlsJumpEndOffsetPx = computed(() => resolveJumpEndOffsetPx(controlsPresentation.value))
const controlsJumpTarget = computed(() => {
  return controlsPresentation.value.jumpTarget === 'card' ? 'card' : defaultJumpTarget.value
})
const controlsActiveIndex = computed(() => activeStandaloneIntroScene.value ? -1 : activeStep.value)
const controlsCanGoPrevious = computed(() => {
  if (activeStandaloneIntroScene.value) return false
  return activeStep.value > 0 || standaloneIntroScenes.value.length > 0
})
const controlsCanGoNext = computed(() => {
  if (activeStandaloneIntroScene.value) return flatSteps.value.length > 0
  return activeStep.value < flatSteps.value.length - 1
})
const visualTransitionMode = computed(() => {
  return normalizedPresentation.value.visualTransitionMode === 'cross-reveal' ? 'cross-reveal' : 'fade'
})
const scrollHintPresentation = computed(() => normalizedPresentation.value.scrollHint || {})
const scrollHintEnabled = computed(() => scrollHintPresentation.value.enabled === true)
const scrollHintMode = computed(() => scrollHintPresentation.value.mode === 'corner' ? 'corner' : 'default')
const scrollHintLabel = computed(() => scrollHintPresentation.value.label || 'Scroll down')
const scrollHintStyle = computed<Record<string, string>>(() => {
  const styles: Record<string, string> = {}
  const fontFamily = scrollHintPresentation.value.fontFamily
  if (typeof fontFamily === 'string' && fontFamily.trim()) {
    styles.fontFamily = fontFamily
  }

  const bottomOffset = scrollHintPresentation.value.bottomOffsetPx
  if (typeof bottomOffset === 'number' && Number.isFinite(bottomOffset)) {
    styles['--story-scroll-hint-bottom'] = `${bottomOffset}px`
  }

  const responsiveBottomOffset = scrollHintPresentation.value.responsiveBottomOffsetPx
  if (Array.isArray(responsiveBottomOffset)) {
    const match = responsiveBottomOffset.find((entry) => {
      if (!entry || typeof entry.value !== 'number' || !Number.isFinite(entry.value)) return false
      if (!viewportWidth.value) return false
      if (typeof entry.minWidth === 'number' && viewportWidth.value < entry.minWidth) return false
      if (typeof entry.maxWidth === 'number' && viewportWidth.value > entry.maxWidth) return false
      return true
    })
    if (match) {
      styles['--story-scroll-hint-bottom'] = `${match.value}px`
    }
  }

  return styles
})
const scrollHintSceneKeys = computed(() => {
  const sceneKeys = scrollHintPresentation.value.sceneKeys
  return Array.isArray(sceneKeys)
    ? sceneKeys.filter((key): key is string => typeof key === 'string' && key.length > 0)
    : []
})
const showScrollHint = computed(() => {
  if (!scrollHintEnabled.value) return false
  if (!activeNavSceneKey.value) return false
  const sceneKeys = scrollHintSceneKeys.value
  return sceneKeys.length ? sceneKeys.includes(activeNavSceneKey.value) : activeStep.value === 0
})

let viewportVarsCleanup: (() => void) | null = null

function updateViewportWidth() {
  viewportWidth.value = window.innerWidth
}

function isCssLengthLike(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 64) return false
  return /^(?:-?\d*\.?\d+(?:px|r?em|%|v[wh]|sv[wh]|lv[wh]|dv[wh])|auto|calc\([A-Za-z0-9+\-*/().,%\s]+\)|clamp\([A-Za-z0-9+\-*/().,%\s]+\))$/.test(trimmed)
}

function hasRenderableValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.some(hasRenderableValue)
  if (value && typeof value === 'object') return Object.values(value).some(hasRenderableValue)
  return false
}

function articleHasContent(article: StoryScene['articles'][number]): boolean {
  const blocks = article.blocks
  if (!Array.isArray(blocks) || blocks.length === 0) return false
  return blocks.some(block => hasRenderableValue(block.props))
}

function isJumpAlign(value: unknown): value is StoryJumpAlign {
  return value === 'center' || value === 'start' || value === 'end'
}

function responsiveRuleMatches(rule: { minWidth?: number; maxWidth?: number } | null | undefined) {
  if (!rule || !viewportWidth.value) return false
  if (typeof rule.minWidth === 'number' && Number.isFinite(rule.minWidth) && viewportWidth.value < rule.minWidth) return false
  if (typeof rule.maxWidth === 'number' && Number.isFinite(rule.maxWidth) && viewportWidth.value > rule.maxWidth) return false
  return true
}

function resolveJumpAlign(presentation: StoryControlsPresentation | StoryChapterNavPresentation): StoryJumpAlign {
  const responsive = presentation.responsiveJumpAlign
  if (Array.isArray(responsive)) {
    const match = responsive.find(rule => responsiveRuleMatches(rule) && isJumpAlign(rule.value))
    if (match) return match.value
  }

  return isJumpAlign(presentation.jumpAlign) ? presentation.jumpAlign : 'center'
}

function resolveJumpEndOffsetPx(presentation: StoryControlsPresentation | StoryChapterNavPresentation) {
  const responsive = presentation.responsiveJumpEndOffsetPx
  if (Array.isArray(responsive)) {
    const match = responsive.find(rule => responsiveRuleMatches(rule) && typeof rule.value === 'number' && Number.isFinite(rule.value))
    if (match) return Math.max(0, match.value)
  }

  return typeof presentation.jumpEndOffsetPx === 'number' && Number.isFinite(presentation.jumpEndOffsetPx)
    ? Math.max(0, presentation.jumpEndOffsetPx)
    : 0
}

const rootStyle = computed<Record<string, string>>(() => {
  const activeProgress = Math.min(1, Math.max(0, activeSceneProgress.value || 0)).toFixed(4)
  const vars: Record<string, string> = {
    '--brand-primary': props.brandColor,
    '--story-active-scene-progress': activeProgress,
    '--story-active-step-progress': activeProgress,
    '--story-visual-bg': '#ffffff',
    '--story-visual-text': '#111111',
    '--story-surface-muted': 'color-mix(in srgb, var(--story-visual-bg, #FFFFFF) 92%, var(--story-visual-text, #111111) 8%)',
    '--story-card-bg': 'color-mix(in srgb, var(--story-visual-bg, #FFFFFF) 96%, var(--story-visual-text, #111111) 4%)',
    '--story-card-border': 'color-mix(in srgb, var(--story-visual-text, #111111) 18%, transparent)',
    '--story-accent': props.brandColor,
    '--story-narrative-bg': '#ffffff',
    '--story-narrative-text': '#111111',
    '--story-narrative-card-border': 'rgba(17, 17, 17, 0.14)',
    '--story-divider': 'rgba(17, 17, 17, 0.14)',
    '--story-cta-bg': props.brandColor,
    '--story-cta-text': '#ffffff',
    '--story-controls-bg': 'color-mix(in srgb, var(--story-visual-bg, #FFFFFF) 94%, var(--story-visual-text, #111111) 6%)',
    '--story-controls-text': 'var(--story-visual-text, #111111)',
    '--story-controls-divider': 'color-mix(in srgb, var(--story-controls-text, #111111) 18%, transparent)',
    '--story-controls-progress': 'var(--story-accent, var(--brand-primary, #007c7e))',
    // Legacy aliases.
    '--story-bg': '#ffffff',
    '--story-text': '#111111',
    '--story-button': props.brandColor,
    '--story-button-text': '#ffffff',
  }

  const resolved = props.themeVars
  if (resolved && typeof resolved === 'object') {
    for (const [key, value] of Object.entries(resolved)) {
      if (typeof key !== 'string' || !key.trim()) continue
      if (typeof value !== 'string' || !value.trim()) continue
      vars[key] = value
    }
  }

  if (!vars['--brand-primary']) {
    vars['--brand-primary'] = vars['--story-cta-bg'] || props.brandColor
  }

  if (isCssLengthLike(scrollPresentation.value.stepMinHeight)) {
    vars['--story-step-min-height'] = scrollPresentation.value.stepMinHeight.trim()
  }

  if (isCssLengthLike(scrollPresentation.value.viewportStackStepMinHeight)) {
    vars['--story-viewport-stack-step-height'] = scrollPresentation.value.viewportStackStepMinHeight.trim()
  }

  return vars
})

const blocks = {
  copy: ArticleCopy,
  cta: ArticleCTA,
  mediaCaption: ArticleMediaCaption,
} as const

let chapterJumpId = 0
let activeSceneProgressRaf: number | null = null
let activeSceneProgressScrollRoot: HTMLElement | null = null
let introScrollAnimationRaf: number | null = null

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function cancelIntroScrollAnimation() {
  if (introScrollAnimationRaf === null) return
  window.cancelAnimationFrame(introScrollAnimationRaf)
  introScrollAnimationRaf = null
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function animateWindowScrollTo(targetY: number, durationMs: number) {
  if (!import.meta.client) return false

  const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const target = Math.max(0, Math.min(maxScrollY, targetY))

  cancelIntroScrollAnimation()

  if (durationMs <= 0 || prefersReducedMotion()) {
    window.scrollTo({ top: target, behavior: durationMs > 0 ? 'smooth' : 'auto' })
    return true
  }

  const start = window.scrollY || window.pageYOffset || 0
  const distance = target - start
  if (Math.abs(distance) < 1) return true

  const startedAt = performance.now()
  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs)
    window.scrollTo(0, start + distance * easeInOutCubic(progress))
    if (progress < 1) {
      introScrollAnimationRaf = window.requestAnimationFrame(tick)
      return
    }

    introScrollAnimationRaf = null
  }

  introScrollAnimationRaf = window.requestAnimationFrame(tick)
  return true
}

function activeProgressViewportTop() {
  if (!effectivePanelScroll.value) return 0
  return stepsRootRef.value?.getBoundingClientRect().top ?? 0
}

function activeProgressVisualSpanPx() {
  if (effectivePanelScroll.value && stepsRootRef.value) {
    return Math.max(1, stepsRootRef.value.clientHeight)
  }

  return Math.max(1, window.innerHeight)
}

function updateActiveSceneProgress() {
  const root = stepsRootRef.value
  if (!root) {
    activeSceneProgress.value = 0
    return
  }

  const stepEl = root.querySelectorAll<HTMLElement>('.step')[activeStep.value]
  if (!stepEl) {
    activeSceneProgress.value = 0
    return
  }

  const rect = stepEl.getBoundingClientRect()
  const viewportTop = activeProgressViewportTop()
  const scrollyRect = scrollyRootRef.value?.getBoundingClientRect()
  const visualLeadInProgress = scrollyRect
    ? clamp01((viewportTop - scrollyRect.top) / activeProgressVisualSpanPx())
    : 0
  const stepProgress = clamp01((viewportTop - rect.top) / Math.max(1, rect.height))
  const progress = activeStep.value === 0 && rect.top > viewportTop
    ? visualLeadInProgress
    : stepProgress
  activeSceneProgress.value = Math.round(progress * 10000) / 10000
}

function scheduleActiveSceneProgressUpdate() {
  if (!import.meta.client) return
  if (activeSceneProgressRaf !== null) return

  activeSceneProgressRaf = window.requestAnimationFrame(() => {
    activeSceneProgressRaf = null
    updateStandaloneIntroState()
    updateActiveSceneProgress()
  })
}

function setActiveSceneProgressScrollRoot(root: HTMLElement | null) {
  if (activeSceneProgressScrollRoot === root) return

  activeSceneProgressScrollRoot?.removeEventListener('scroll', scheduleActiveSceneProgressUpdate)
  activeSceneProgressScrollRoot = root
  activeSceneProgressScrollRoot?.addEventListener('scroll', scheduleActiveSceneProgressUpdate, { passive: true })
}

function syncActiveSceneProgressScrollRoot() {
  setActiveSceneProgressScrollRoot(effectivePanelScroll.value ? stepsRootRef.value : null)
}

function setStandaloneIntroSceneRef(index: number, el: Element | null) {
  if (el instanceof HTMLElement) {
    standaloneIntroSceneRefs[index] = el
  } else {
    delete standaloneIntroSceneRefs[index]
  }
}

function standaloneIntroProgress(index: number) {
  return standaloneIntroProgressByIndex.value[index] ?? 0
}

function updateStandaloneIntroState() {
  const scenes = standaloneIntroScenes.value
  if (!scenes.length || effectivePanelScroll.value) {
    activeStandaloneIntroIndex.value = null
    standaloneIntroProgressByIndex.value = {}
    return
  }

  const activationBottom = window.innerHeight / 2 + 40
  let activeIndex: number | null = null
  const progressByIndex: Record<number, number> = {}

  scenes.forEach((_scene, index) => {
    const el = standaloneIntroSceneRefs[index]
    if (!el) return

    const rect = el.getBoundingClientRect()
    progressByIndex[index] = Math.round(clamp01(-rect.top / Math.max(1, rect.height)) * 10000) / 10000
    if (rect.top <= window.innerHeight && rect.bottom > activationBottom) {
      activeIndex = index
    }
  })

  activeStandaloneIntroIndex.value = activeIndex
  standaloneIntroProgressByIndex.value = progressByIndex
}

function originalSceneIndex(scrollySceneIndex: number) {
  return standaloneIntroCount.value + scrollySceneIndex
}

function sceneMatchesKeys(scene: StoryScene | undefined, sceneKeys: string[]) {
  if (!scene) return false
  return [scene.key, scene.sourceKey].some(key => key && sceneKeys.includes(key))
}

function standaloneIntroIndexForSceneKeys(sceneKeys: string[]) {
  return standaloneIntroScenes.value.findIndex(scene => sceneMatchesKeys(scene, sceneKeys))
}

function scrollToStandaloneIntro(index: number, behavior: ScrollBehavior = 'smooth', durationMs = 0) {
  const el = standaloneIntroSceneRefs[index]
  if (!el) return false
  if (durationMs > 0 && behavior !== 'auto' && !effectivePanelScroll.value) {
    return animateWindowScrollTo(window.scrollY + el.getBoundingClientRect().top, durationMs)
  }

  cancelIntroScrollAnimation()
  el.scrollIntoView({ block: 'start', inline: 'nearest', behavior })
  return true
}

function scrollFromStandaloneIntro(behavior: ScrollBehavior = 'smooth') {
  if (introExitTarget.value === 'scrolly-start' && !effectivePanelScroll.value && scrollyRootRef.value) {
    const rect = scrollyRootRef.value.getBoundingClientRect()
    return animateWindowScrollTo(window.scrollY + rect.top, introExitDurationMs.value)
  }

  return scrollToStepIndex(
    0,
    behavior,
    1,
    controlsJumpAlign.value,
    controlsJumpTarget.value,
    controlsJumpEndOffsetPx.value,
    introExitDurationMs.value,
  )
}

function stepSceneKeys(index: number): string[] {
  const step = flatSteps.value[index]
  if (!step) return []

  const scene = scrollyScenes.value[step.sceneIdx]
  return [scene?.key, scene?.sourceKey].filter((value): value is string => !!value)
}

function stepMatchesSceneKeys(index: number, sceneKeys: string[]) {
  return stepSceneKeys(index).some(key => sceneKeys.includes(key))
}

function resolveChapterTargetIndex(sceneKeys: string[]) {
  for (const sceneKey of sceneKeys) {
    const firstSceneStep = flatSteps.value.findIndex((_step, index) => stepMatchesSceneKeys(index, [sceneKey]))
    if (firstSceneStep === -1) continue

    const visibleIndex = resolveVisibleStepIndex(firstSceneStep, 1)
    if (visibleIndex !== null && stepMatchesSceneKeys(visibleIndex, sceneKeys)) {
      return visibleIndex
    }
  }

  return null
}

function visibleChapterStepElement(sceneKeys: string[]) {
  const root = stepsRootRef.value
  if (!root) return null

  const isDesktop = window.innerWidth > 1024
  const steps = Array.from(root.querySelectorAll<HTMLElement>('.step'))

  return steps.find((el) => {
    const sourceKey = el.dataset.auSourceKey || el.dataset.sceneKey
    if (!sourceKey || !sceneKeys.includes(sourceKey)) return false
    if (isDesktop && el.dataset.mobileOnly === 'true') return false
    if (!isDesktop && el.dataset.desktopOnly === 'true') return false
    return el.offsetParent !== null
  }) || null
}

function alignChapterStep(sceneKeys: string[]) {
  const el = visibleChapterStepElement(sceneKeys)
  if (!el) return

  const rect = el.getBoundingClientRect()
  if (Math.abs(rect.top) <= 4) return

  el.scrollIntoView({
    block: 'start',
    inline: 'nearest',
    behavior: 'auto',
  })
}

function onChapterJump(sceneKeys: string[]) {
  const standaloneIndex = standaloneIntroIndexForSceneKeys(sceneKeys)
  if (standaloneIndex !== -1) {
    scrollToStandaloneIntro(standaloneIndex)
    return
  }

  const target = resolveChapterTargetIndex(sceneKeys)
  if (target === null) return

  const jumpId = ++chapterJumpId
  const direction = target < activeStep.value ? -1 : 1
  scrollToStepIndex(
    target,
    'auto',
    direction,
    chapterNavJumpAlign.value,
    chapterNavJumpTarget.value,
    chapterNavJumpEndOffsetPx.value,
  )

  if (chapterNavJumpTarget.value === 'card' || chapterNavJumpAlign.value !== 'start') return

  const realign = () => {
    if (jumpId !== chapterJumpId) return
    alignChapterStep(sceneKeys)
  }

  requestAnimationFrame(realign)
  window.setTimeout(realign, 200)
  window.setTimeout(realign, 1000)
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const el = target as HTMLElement
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return Boolean(el.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
}

function navigateStep(delta: number, behavior: ScrollBehavior = 'smooth') {
  if (activeStandaloneIntroScene.value && delta > 0) {
    return scrollFromStandaloneIntro(behavior)
  }

  if (!activeStandaloneIntroScene.value && delta < 0 && activeStep.value === 0 && standaloneIntroScenes.value.length) {
    return scrollToStandaloneIntro(standaloneIntroScenes.value.length - 1, behavior, introReturnDurationMs.value)
  }

  const target = getStepTargetIndex(activeStep.value, delta)
  if (target === null || target === activeStep.value) return false
  return scrollToStepIndex(
    target,
    behavior,
    delta,
    controlsJumpAlign.value,
    controlsJumpTarget.value,
    controlsJumpEndOffsetPx.value,
  )
}

function jumpFromControls(index: number, behavior: ScrollBehavior, direction: number) {
  if (activeStandaloneIntroScene.value && direction > 0 && index === 0) {
    return scrollFromStandaloneIntro(behavior)
  }

  if (!activeStandaloneIntroScene.value && direction < 0 && activeStep.value === 0 && standaloneIntroScenes.value.length) {
    return scrollToStandaloneIntro(standaloneIntroScenes.value.length - 1, behavior, introReturnDurationMs.value)
  }

  return scrollToStepIndex(
    index,
    behavior,
    direction,
    controlsJumpAlign.value,
    controlsJumpTarget.value,
    controlsJumpEndOffsetPx.value,
  )
}

function onStepKeydown(event: KeyboardEvent) {
  if (!controlsKeyboard.value) return
  if (event.defaultPrevented || event.repeat) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (isTypingTarget(event.target)) return

  const keyDelta: Record<string, number> = {
    ArrowUp: -1,
    PageUp: -1,
    ArrowDown: 1,
    PageDown: 1,
  }
  const delta = keyDelta[event.key]
  if (!delta) return

  event.preventDefault()
  navigateStep(delta)
}

function onVisualReady(key: string) {
  // Optional hook for hosts; for now we keep parity with partner-stories by calling visual.onEnter if present.
  const stepMeta = flatSteps.value[activeStep.value]
  const s = stepMeta ? scrollyScenes.value[stepMeta.sceneIdx] : null
  if (s && (s as any).visual?.onEnter && s.key === key) {
    ;(s as any).visual.onEnter?.({ step: stepMeta.localStep, ref: visualRefs[key] })
  }
}

function updateViewportVars() {
  const root = document.documentElement
  const visualViewport = window.visualViewport
  const layoutViewportHeight = Math.max(1, window.innerHeight)
  const visualViewportHeight = visualViewport?.height ?? layoutViewportHeight
  const visualViewportTop = Math.max(0, visualViewport?.offsetTop ?? 0)
  const visualViewportBottomInset = Math.max(
    0,
    layoutViewportHeight - visualViewportHeight - visualViewportTop,
  )
  const bodyZoomRaw = parseFloat(getComputedStyle(document.body).zoom || '1')
  const bodyZoom = Number.isFinite(bodyZoomRaw) && bodyZoomRaw > 0 ? bodyZoomRaw : 1

  root.style.setProperty('--story-layout-height', `${Math.round(visualViewportHeight / bodyZoom)}px`)
  root.style.setProperty('--story-vv-height', `${Math.round(visualViewportHeight / bodyZoom)}px`)
  root.style.setProperty('--story-vv-top', `${Math.round(visualViewportTop / bodyZoom)}px`)
  root.style.setProperty('--story-vv-bottom', `${Math.round(visualViewportBottomInset / bodyZoom)}px`)
}

function installViewportVarListeners() {
  updateViewportVars()
  requestAnimationFrame(updateViewportVars)
  window.setTimeout(updateViewportVars, 250)

  window.addEventListener('resize', updateViewportVars, { passive: true })
  window.addEventListener('scroll', updateViewportVars, { passive: true })
  window.addEventListener('orientationchange', updateViewportVars, { passive: true })
  window.visualViewport?.addEventListener('resize', updateViewportVars, { passive: true })
  window.visualViewport?.addEventListener('scroll', updateViewportVars, { passive: true })

  viewportVarsCleanup = () => {
    window.removeEventListener('resize', updateViewportVars)
    window.removeEventListener('scroll', updateViewportVars)
    window.removeEventListener('orientationchange', updateViewportVars)
    window.visualViewport?.removeEventListener('resize', updateViewportVars)
    window.visualViewport?.removeEventListener('scroll', updateViewportVars)
    document.documentElement.style.removeProperty('--story-layout-height')
    document.documentElement.style.removeProperty('--story-vv-height')
    document.documentElement.style.removeProperty('--story-vv-top')
    document.documentElement.style.removeProperty('--story-vv-bottom')
    viewportVarsCleanup = null
  }
}

watch(activeStep, () => {
  // no-op placeholder; hosts may attach their own watchers via v-model in the future
})

onMounted(() => {
  updateViewportWidth()
  installViewportVarListeners()
  window.addEventListener('resize', updateViewportWidth, { passive: true })
  window.addEventListener('resize', scheduleActiveSceneProgressUpdate, { passive: true })
  window.addEventListener('scroll', scheduleActiveSceneProgressUpdate, { passive: true })
  window.addEventListener('keydown', onStepKeydown)
  nextTick(() => {
    syncActiveSceneProgressScrollRoot()
    scheduleActiveSceneProgressUpdate()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportWidth)
  window.removeEventListener('resize', scheduleActiveSceneProgressUpdate)
  window.removeEventListener('scroll', scheduleActiveSceneProgressUpdate)
  window.removeEventListener('keydown', onStepKeydown)
  setActiveSceneProgressScrollRoot(null)
  if (activeSceneProgressRaf !== null) {
    window.cancelAnimationFrame(activeSceneProgressRaf)
    activeSceneProgressRaf = null
  }
  cancelIntroScrollAnimation()
  viewportVarsCleanup?.()
})

watch([activeStep, flatSteps, effectivePanelScroll, stepsRootRef], () => {
  nextTick(() => {
    syncActiveSceneProgressScrollRoot()
    scheduleActiveSceneProgressUpdate()
  })
}, { flush: 'post' })
</script>

<template>
  <div
    class="autumn-story-root"
    :style="rootStyle"
  >
    <ClientOnly v-if="showChapterNav">
      <StoryChapterNav
        :chapters="presentationChapters"
        :active-scene-key="activeNavSceneKey"
        :brand-label="chapterNavBrandLabel"
        :aria-label="chapterNavAriaLabel"
        :chrome-mode="chapterNavChromeMode"
        :show-toggle="chapterNavShowToggle"
        :inactive-label="chapterNavInactiveLabel"
        :inactive-behavior="chapterNavInactiveBehavior"
        :brand="chapterNavBrand"
        :brand-mode="chapterNavBrandMode"
        :cta="chapterNavCta"
        :dark-scene-keys="chapterNavDarkSceneKeys"
        :disable-teleport="disableChromeTeleport"
        @jump="onChapterJump"
      />
    </ClientOnly>

    <ClientOnly v-if="showScrollHint">
      <div
        class="story-scroll-hint"
        :class="`story-scroll-hint--${scrollHintMode}`"
        :data-story-scroll-hint="scrollHintMode"
        :style="scrollHintStyle"
        aria-hidden="true"
      >
        <template v-if="scrollHintMode === 'corner'">
          <span class="story-scroll-hint__mouse" aria-hidden="true">
            <span class="story-scroll-hint__wheel" />
          </span>
          <span class="story-scroll-hint__label">{{ scrollHintLabel }}</span>
        </template>
        <span v-else class="story-scroll-hint__label">{{ scrollHintLabel }}</span>
      </div>
    </ClientOnly>

    <section
      v-for="(scene, introIndex) in standaloneIntroScenes"
      :key="scene.key"
      :ref="(el) => setStandaloneIntroSceneRef(introIndex, el as Element | null)"
      class="story-standalone-scene"
      :data-scene-key="scene.key"
      :data-au-source-key="scene.sourceKey"
      :data-au-scene-id="scene.id ?? scene.key"
      :data-au-scene-index="introIndex"
      data-au-scene-flow="standalone"
    >
      <slot
        name="visual"
        :scene="scene"
        :step="0"
        :scene-progress="standaloneIntroProgress(introIndex)"
        :active="activeStandaloneIntroIndex === introIndex"
        :visualRefs="visualRefs"
      />
    </section>

    <section
      id="scrolly"
      ref="scrollyRootRef"
      class="flex md:flex-row flex-col w-full min-w-0 bg-[var(--story-visual-bg)] text-[var(--story-visual-text)] [font-family:var(--story-font-body)]"
      :class="effectivePanelScroll ? 'md:h-screen md:items-stretch' : ''"
      :data-au-card-mode="activeCardMode"
      :data-au-card-align="activeCardAlign"
      :data-au-force-viewport-card-stack="forceViewportCardStack ? 'true' : undefined"
    >
      <ScrollVisual
        :scene-key="activeScene.key"
        :disable-parallax="activeScene.visual?.disableParallax === true"
        :transition-mode="visualTransitionMode"
        class="shrink-0 min-w-0 bg-[var(--story-visual-bg)] text-[var(--story-visual-text)]"
        :class="isFullLayout ? 'w-full md:z-20' : 'w-full md:w-[60%]'"
        @ready="onVisualReady"
      >
        <slot
          name="visual"
          :scene="activeScene"
          :step="flatSteps[activeStep]?.localStep ?? 0"
          :scene-progress="activeSceneProgress"
          :active="true"
          :visualRefs="visualRefs"
        />
      </ScrollVisual>

      <article
        ref="stepsRootRef"
        class="storytime-article-column w-full md:w-[40%] min-w-0 mx-auto md:mx-0 px-6 md:px-10 lg:px-16 transition-opacity duration-500 pointer-events-none md:pointer-events-auto md:border-l text-[var(--story-narrative-text)]"
        :style="{ borderLeftColor: 'var(--story-divider)' }"
        :class="[
          { 'opacity-0': !stepsReady, 'opacity-100': stepsReady },
          activeCardMode === 'hidden'
            ? 'storytime-article-column--hidden pointer-events-none z-10'
            : 'pointer-events-none md:pointer-events-auto z-10 lg:z-10',
          effectivePanelScroll ? 'md:h-screen md:overflow-y-auto md:overscroll-contain' : '',
        ]"
        :data-au-card-mode="activeCardMode"
        :data-au-card-align="activeCardAlign"
      >
        <ArticleStep
          v-for="(step, i) in flatSteps"
          :key="i"
          class="step flex items-start lg:items-center z-50"
          :data-scene-key="scrollyScenes[step.sceneIdx]?.key"
          :data-au-source-key="scrollyScenes[step.sceneIdx]?.sourceKey"
          :data-au-scene-id="scrollyScenes[step.sceneIdx]?.id ?? scrollyScenes[step.sceneIdx]?.key"
          :data-au-scene-index="originalSceneIndex(step.sceneIdx)"
          :data-mobile-only="step.article.mobileOnly ? 'true' : undefined"
          :data-desktop-only="step.article.desktopOnly ? 'true' : undefined"
          :align="step.article.align || 'left'"
          :empty="!articleHasContent(step.article)"
        >
          <template v-if="step.article.blocks?.length">
            <template v-for="(b, bi) in step.article.blocks" :key="bi">
              <component
                v-if="b.type !== 'html' && b.type !== 'markdown'"
                :is="(blocks as any)[b.type]"
                v-bind="b.props"
              />
              <div v-else v-html="b.props.html" />
            </template>
          </template>
        </ArticleStep>
      </article>

      <ClientOnly v-if="controls">
        <BottomActionBar
          :active-index="controlsActiveIndex"
          :total="flatSteps.length"
          :active-visual="activeVisualRef"
          :can-go-previous="controlsCanGoPrevious"
          :can-go-next="controlsCanGoNext"
          :control-mode="controlsMode"
          :show-share="controlsShowShare"
          :show-progress="controlsShowProgress"
          :show-video-controls="controlsShowVideoControls"
          :hide-on-mobile-below="controlsHideOnMobileBelow"
          :auto-hide-on-mobile="controlsAutoHideOnMobile"
          :bottom-offset-px="controlsBottomOffsetPx"
          :responsive-bottom-offset-px="controlsResponsiveBottomOffsetPx"
          :mobile-cta="controlsMobileCta"
          :steps-root="stepsRootRef"
          step-selector=".step"
          :step-target-resolver="getStepTargetIndex"
          :scroll-container="effectivePanelScroll ? stepsRootRef : null"
          :jump-align="controlsJumpAlign"
          :jump-end-offset-px="controlsJumpEndOffsetPx"
          :jump-target="controlsJumpTarget"
          :step-jumper="jumpFromControls"
        />
      </ClientOnly>
    </section>
  </div>
</template>

<style scoped>
.autumn-story-root :deep(h1),
.autumn-story-root :deep(h2),
.autumn-story-root :deep(h3),
.autumn-story-root :deep(h4),
.autumn-story-root :deep(h5),
.autumn-story-root :deep(h6) {
  font-family: var(--story-font-heading);
}

.storytime-article-column {
  background-color: transparent;
}

.story-standalone-scene {
  position: relative;
  width: 100%;
  height: var(--story-layout-height, 100dvh);
  min-height: var(--story-layout-height, 100dvh);
  overflow: hidden;
  background: var(--story-visual-bg, #ffffff);
  color: var(--story-visual-text, #111111);
}

@supports (min-height: 100lvh) {
  .story-standalone-scene {
    height: var(--story-layout-height, 100lvh);
    min-height: var(--story-layout-height, 100lvh);
  }
}

.story-scroll-hint {
  position: fixed;
  z-index: 40;
  left: 50%;
  bottom: calc(var(--story-scroll-hint-bottom, 160px) + env(safe-area-inset-bottom, 0px) + min(var(--story-vv-bottom, 0px), 24px));
  display: inline-flex;
  pointer-events: none;
  transform: translateX(-50%);
}

.story-scroll-hint--corner {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  opacity: 0.9;
  animation: storyWe2CueNudge 2.1s ease-in-out infinite;
}

.story-scroll-hint__mouse {
  display: inline-flex;
  justify-content: center;
  width: 18px;
  height: 26px;
  padding-top: 4px;
  border: 2px solid currentColor;
  border-radius: 12px;
}

.story-scroll-hint__wheel {
  width: 3px;
  height: 7px;
  border-radius: 2px;
  background: currentColor;
  animation: storyWe2CueWheel 1.2s ease-in-out infinite;
}

.story-scroll-hint__label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

@keyframes storyWe2CueNudge {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(3px);
  }
}

@keyframes storyWe2CueWheel {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  75% {
    transform: translateY(6px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 0;
  }
}

@media (min-width: 1024px) {
  .storytime-article-column {
    background-color: var(--story-narrative-bg);
  }
}
</style>
