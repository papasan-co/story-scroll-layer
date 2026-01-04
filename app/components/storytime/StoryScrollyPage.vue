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
}>(), {
  controls: true,
  brandColor: '#007c7e',
})

const scrollyRootRef = ref<HTMLElement | null>(null)
const stepsRootRef = ref<HTMLElement | null>(null)

const flatSteps = computed(() => useStepStructure(props.scenes))
const visualRefs = reactive<Record<string, any>>({})

const { activeStep, stepsReady } = useIoScroller(flatSteps.value, props.scenes, visualRefs, {
  stepsRoot: stepsRootRef,
  stepSelector: '.step',
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
  <div :style="{ '--brand-primary': brandColor }">
    <section
      id="scrolly"
      ref="scrollyRootRef"
      class="flex md:flex-row flex-col"
    >
      <ScrollVisual
        :scene-key="activeScene.key"
        class="w-full shrink-0"
        :class="isFullLayout ? 'lg:w-full lg:z-20' : 'lg:w-3/5'"
        @ready="onVisualReady"
      >
        <slot name="visual" :scene="activeScene" :step="flatSteps[activeStep]?.localStep ?? 0" :visualRefs="visualRefs" />
      </ScrollVisual>

      <article
        ref="stepsRootRef"
        class="w-full lg:w-2/5 mx-auto px-6 lg:px-16 transition-opacity duration-500 pointer-events-none md:pointer-events-auto"
        :class="[
          { 'opacity-0': !stepsReady, 'opacity-100': stepsReady },
          isFullLayout
            ? 'lg:hidden'
            : 'pointer-events-none md:pointer-events-auto z-10 lg:z-10',
        ]"
      >
        <div
          v-for="(step, i) in flatSteps"
          :key="i"
          class="step flex items-start lg:items-center z-50"
          :data-scene-key="props.scenes[step.sceneIdx]?.key"
        >
          <ArticleStep :align="step.article.align || 'left'">
            <template v-if="step.article.blocks?.length">
              <template v-for="(b, bi) in step.article.blocks" :key="bi">
                <component
                  v-if="b.type !== 'html'"
                  :is="(blocks as any)[b.type]"
                  v-bind="b.props"
                />
                <div v-else v-html="b.props.html" />
              </template>
            </template>
          </ArticleStep>
        </div>
      </article>

      <ClientOnly v-if="controls">
        <BottomActionBar
          :active-index="activeStep"
          :total="flatSteps.length"
          :active-visual="activeVisualRef"
          :steps-root="stepsRootRef"
          step-selector=".step"
        />
      </ClientOnly>
    </section>
  </div>
</template>

