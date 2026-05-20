<script setup lang="ts">
import { reactive, computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { StoryPresentation, StoryScene } from '../../types/storytime/scenes'
import { useStepStructure } from '../../composables/storytime/useStepStructure'
import { useIoScroller } from '../../composables/storytime/useIoScroller'
import { useCssVarScroll } from '../../composables/storytime/useCssVarScroll'

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
}>(), {
  controls: true,
  brandColor: '#007c7e',
  panelScroll: false,
  themeVars: null,
  presentation: null,
})

const scrollyRootRef = ref<HTMLElement | null>(null)
const stepsRootRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(0)

const effectivePanelScroll = computed(() => !!props.panelScroll)

const flatSteps = computed(() => useStepStructure(props.scenes))
const visualRefs = reactive<Record<string, any>>({})
const forceViewportCardStack = computed(() => props.scenes.some(scene => scene.cardMode === 'viewport-stack'))
const scrollPresentation = computed(() => props.presentation?.scroll || {})
const defaultJumpTarget = computed(() => scrollPresentation.value.jumpTarget === 'card' ? 'card' : 'step')
const activationMode = computed(() => scrollPresentation.value.activationMode === 'card-center' ? 'card-center' : 'step-exit')
const activationAnchor = computed(() => {
  const value = scrollPresentation.value.activationAnchor
  return typeof value === 'number' && Number.isFinite(value) ? value : 0.7
})
const activationHysteresisPx = computed(() => {
  const value = scrollPresentation.value.activationHysteresisPx
  return typeof value === 'number' && Number.isFinite(value) ? value : 24
})

const { activeStep, stepsReady, getStepTargetIndex, resolveVisibleStepIndex, scrollToStepIndex } = useIoScroller(flatSteps.value, props.scenes, visualRefs, {
  stepsRoot: stepsRootRef,
  stepSelector: '.step',
  scrollRoot: effectivePanelScroll.value ? stepsRootRef : null,
  disableSnap: effectivePanelScroll.value,
  forceMobileSpacing: forceViewportCardStack,
  scrollTarget: defaultJumpTarget,
  activationMode,
  activationAnchor,
  activationHysteresisPx,
})

useCssVarScroll(scrollyRootRef)

const activeScene = computed(() => {
  const step = flatSteps.value[activeStep.value]
  if (!step) return props.scenes[0]
  return props.scenes[step.sceneIdx]
})

const activeVisualRef = computed(() => {
  const scene = activeScene.value
  return visualRefs[scene?.key]
})

const isFullLayout = computed(() => activeScene.value?.layout === 'full')
const activeCardMode = computed(() => activeScene.value?.cardMode ?? (isFullLayout.value ? 'hidden' : 'side-by-side'))
const activeCardAlign = computed(() => activeScene.value?.cardAlign ?? 'right')
const presentationChapters = computed(() => props.presentation?.chapters || [])
const presentationNavMode = computed(() => String(props.presentation?.navMode || ''))
const showChapterNav = computed(() => {
  if (!presentationChapters.value.length) return false
  const mode = presentationNavMode.value
  return !mode || mode === 'chapter-nav' || mode === 'both' || mode.split(/\s+/).includes('chapter-nav')
})
const activeNavSceneKey = computed(() => activeScene.value?.sourceKey || activeScene.value?.key || '')
const chapterNavPresentation = computed(() => props.presentation?.chapterNav || {})
const chapterNavVariant = computed(() => chapterNavPresentation.value.variant === 'we2' ? 'we2' : 'default')
const chapterNavShowToggle = computed(() => chapterNavPresentation.value.showToggle !== false)
const chapterNavBrand = computed(() => chapterNavPresentation.value.brand || null)
const chapterNavCta = computed(() => chapterNavPresentation.value.cta || null)
const chapterNavJumpAlign = computed(() => {
  return chapterNavPresentation.value.jumpAlign === 'start' ? 'start' : 'center'
})
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
  const presentation = props.presentation as Record<string, any> | null
  return presentation?.brandLabel || presentation?.navBrandLabel || ''
})
const chapterNavAriaLabel = computed(() => {
  const presentation = props.presentation as Record<string, any> | null
  return presentation?.navAriaLabel || 'Story chapters'
})
const controlsPresentation = computed(() => props.presentation?.controls || {})
const controlsVariant = computed(() => {
  const variant = controlsPresentation.value.variant
  return variant === 'minimal' || variant === 'we2' ? variant : 'default'
})
const controlsShowShare = computed(() => controlsPresentation.value.showShare !== false)
const controlsShowProgress = computed(() => controlsPresentation.value.showProgress !== false)
const controlsShowVideoControls = computed(() => controlsPresentation.value.showVideoControls !== false)
const controlsKeyboard = computed(() => controlsPresentation.value.keyboard !== false)
const controlsHideOnMobileBelow = computed(() => {
  const value = controlsPresentation.value.hideOnMobileBelow
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
})
const controlsBottomOffsetPx = computed(() => {
  const value = controlsPresentation.value.bottomOffsetPx
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
})
const controlsResponsiveBottomOffsetPx = computed(() => {
  const value = controlsPresentation.value.responsiveBottomOffsetPx
  return Array.isArray(value) ? value : undefined
})
const controlsJumpAlign = computed(() => {
  return controlsPresentation.value.jumpAlign === 'start' ? 'start' : 'center'
})
const controlsJumpTarget = computed(() => {
  return controlsPresentation.value.jumpTarget === 'card' ? 'card' : defaultJumpTarget.value
})
const visualTransitionMode = computed(() => {
  return props.presentation?.visualTransitionMode === 'cross-reveal' ? 'cross-reveal' : 'fade'
})
const scrollHintPresentation = computed(() => props.presentation?.scrollHint || {})
const scrollHintEnabled = computed(() => scrollHintPresentation.value.enabled === true)
const scrollHintVariant = computed(() => scrollHintPresentation.value.variant === 'we2' ? 'we2' : 'default')
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

const rootStyle = computed<Record<string, string>>(() => {
  const vars: Record<string, string> = {
    '--brand-primary': props.brandColor,
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
    '--story-font-heading': 'inherit',
    '--story-font-body': 'inherit',
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

function stepSceneKeys(index: number): string[] {
  const step = flatSteps.value[index]
  if (!step) return []

  const scene = props.scenes[step.sceneIdx]
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
  const target = resolveChapterTargetIndex(sceneKeys)
  if (target === null) return

  const jumpId = ++chapterJumpId
  const direction = target < activeStep.value ? -1 : 1
  scrollToStepIndex(target, 'auto', direction, chapterNavJumpAlign.value, chapterNavJumpTarget.value)

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
  const target = getStepTargetIndex(activeStep.value, delta)
  if (target === null || target === activeStep.value) return false
  return scrollToStepIndex(target, behavior, delta, controlsJumpAlign.value, controlsJumpTarget.value)
}

function jumpFromControls(index: number, behavior: ScrollBehavior, direction: number) {
  return scrollToStepIndex(index, behavior, direction, controlsJumpAlign.value, controlsJumpTarget.value)
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
  const s = stepMeta ? props.scenes[stepMeta.sceneIdx] : null
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
  window.addEventListener('keydown', onStepKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportWidth)
  window.removeEventListener('keydown', onStepKeydown)
  viewportVarsCleanup?.()
})
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
        :variant="chapterNavVariant"
        :show-toggle="chapterNavShowToggle"
        :brand="chapterNavBrand"
        :cta="chapterNavCta"
        :dark-scene-keys="chapterNavDarkSceneKeys"
        @jump="onChapterJump"
      />
    </ClientOnly>

    <ClientOnly v-if="showScrollHint">
      <div
        class="story-scroll-hint"
        :class="`story-scroll-hint--${scrollHintVariant}`"
        :style="scrollHintStyle"
        aria-hidden="true"
      >
        <template v-if="scrollHintVariant === 'we2'">
          <span class="story-scroll-hint__mouse" aria-hidden="true">
            <span class="story-scroll-hint__wheel" />
          </span>
          <span class="story-scroll-hint__label">{{ scrollHintLabel }}</span>
        </template>
        <span v-else class="story-scroll-hint__label">{{ scrollHintLabel }}</span>
      </div>
    </ClientOnly>

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
        <slot name="visual" :scene="activeScene" :step="flatSteps[activeStep]?.localStep ?? 0" :visualRefs="visualRefs" />
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
          :data-scene-key="props.scenes[step.sceneIdx]?.key"
          :data-au-source-key="props.scenes[step.sceneIdx]?.sourceKey"
          :data-au-scene-id="props.scenes[step.sceneIdx]?.id ?? props.scenes[step.sceneIdx]?.key"
          :data-au-scene-index="step.sceneIdx"
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
          :active-index="activeStep"
          :total="flatSteps.length"
          :active-visual="activeVisualRef"
          :variant="controlsVariant"
          :show-share="controlsShowShare"
          :show-progress="controlsShowProgress"
          :show-video-controls="controlsShowVideoControls"
          :hide-on-mobile-below="controlsHideOnMobileBelow"
          :bottom-offset-px="controlsBottomOffsetPx"
          :responsive-bottom-offset-px="controlsResponsiveBottomOffsetPx"
          :steps-root="stepsRootRef"
          step-selector=".step"
          :step-target-resolver="getStepTargetIndex"
          :scroll-container="effectivePanelScroll ? stepsRootRef : null"
          :jump-align="controlsJumpAlign"
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

.story-scroll-hint {
  position: fixed;
  z-index: 40;
  left: 50%;
  bottom: calc(var(--story-scroll-hint-bottom, 160px) + env(safe-area-inset-bottom, 0px) + min(var(--story-vv-bottom, 0px), 24px));
  display: inline-flex;
  pointer-events: none;
  transform: translateX(-50%);
}

.story-scroll-hint--we2 {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #f2f4f8;
  opacity: 0.9;
  animation: storyWe2CueNudge 2.1s ease-in-out infinite;
}

.story-scroll-hint__mouse {
  display: inline-flex;
  justify-content: center;
  width: 18px;
  height: 26px;
  padding-top: 4px;
  border: 2px solid rgba(242, 244, 248, 0.85);
  border-radius: 12px;
}

.story-scroll-hint__wheel {
  width: 3px;
  height: 7px;
  border-radius: 2px;
  background: #f2f4f8;
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
