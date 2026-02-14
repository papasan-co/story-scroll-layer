<script setup lang="ts">
import { reactive, computed, ref, watch } from 'vue'
import type { StoryScene } from '../../types/storytime/scenes'
import { useStepStructure } from '../../composables/storytime/useStepStructure'
import { useIoScroller } from '../../composables/storytime/useIoScroller'
import { useCssVarScroll } from '../../composables/storytime/useCssVarScroll'

import ScrollVisual from './blocks/ScrollVisual.vue'
import ArticleStep from './blocks/ArticleStep.vue'
import ArticleCopy from './blocks/ArticleCopy.vue'
import ArticleCTA from './blocks/ArticleCTA.vue'
import ArticleMediaCaption from './blocks/ArticleMediaCaption.vue'
import BottomActionBar from './controls/BottomActionBar.client.vue'

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
}>(), {
  controls: true,
  brandColor: '#007c7e',
  panelScroll: false,
  themeVars: null,
})

const scrollyRootRef = ref<HTMLElement | null>(null)
const stepsRootRef = ref<HTMLElement | null>(null)

const effectivePanelScroll = computed(() => !!props.panelScroll)

const flatSteps = computed(() => useStepStructure(props.scenes))
const visualRefs = reactive<Record<string, any>>({})

const { activeStep, stepsReady } = useIoScroller(flatSteps.value, props.scenes, visualRefs, {
  stepsRoot: stepsRootRef,
  stepSelector: '.step',
  scrollRoot: effectivePanelScroll.value ? stepsRootRef : null,
  disableSnap: effectivePanelScroll.value,
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
    '--story-font-heading': 'inherit',
    '--story-font-body': 'inherit',
    // Legacy aliases.
    '--story-bg': '#ffffff',
    '--story-text': '#111111',
    '--story-button': props.brandColor,
    '--story-button-text': '#ffffff',
  }

  const resolved = props.themeVars
  if (!resolved || typeof resolved !== 'object') {
    return vars
  }

  for (const [key, value] of Object.entries(resolved)) {
    if (typeof key !== 'string' || !key.trim()) continue
    if (typeof value !== 'string' || !value.trim()) continue
    vars[key] = value
  }

  if (!vars['--brand-primary']) {
    vars['--brand-primary'] = vars['--story-cta-bg'] || props.brandColor
  }

  return vars
})

const blocks = {
  copy: ArticleCopy,
  cta: ArticleCTA,
  mediaCaption: ArticleMediaCaption,
} as const

function onVisualReady(key: string) {
  // Optional hook for hosts; for now we keep parity with partner-stories by calling visual.onEnter if present.
  const stepMeta = flatSteps.value[activeStep.value]
  const s = stepMeta ? props.scenes[stepMeta.sceneIdx] : null
  if (s && (s as any).visual?.onEnter && s.key === key) {
    ;(s as any).visual.onEnter?.({ step: stepMeta.localStep, ref: visualRefs[key] })
  }
}

watch(activeStep, () => {
  // no-op placeholder; hosts may attach their own watchers via v-model in the future
})
</script>

<template>
  <div
    class="autumn-story-root"
    :style="rootStyle"
  >
    <section
      id="scrolly"
      ref="scrollyRootRef"
      class="flex md:flex-row flex-col w-full min-w-0 bg-[var(--story-visual-bg)] text-[var(--story-visual-text)] [font-family:var(--story-font-body)]"
      :class="effectivePanelScroll ? 'md:h-screen md:items-stretch' : ''"
    >
      <ScrollVisual
        :scene-key="activeScene.key"
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
          isFullLayout
            ? 'md:hidden'
            : 'pointer-events-none md:pointer-events-auto z-10 lg:z-10',
          effectivePanelScroll ? 'md:h-screen md:overflow-y-auto md:overscroll-contain' : '',
        ]"
      >
        <ArticleStep
          v-for="(step, i) in flatSteps"
          :key="i"
          class="step flex items-start lg:items-center z-50"
          :data-scene-key="props.scenes[step.sceneIdx]?.key"
          :align="step.article.align || 'left'"
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
          :steps-root="stepsRootRef"
          step-selector=".step"
          :scroll-container="effectivePanelScroll ? stepsRootRef : null"
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

@media (min-width: 1024px) {
  .storytime-article-column {
    background-color: var(--story-narrative-bg);
  }
}
</style>