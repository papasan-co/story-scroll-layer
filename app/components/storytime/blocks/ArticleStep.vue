<script setup lang="ts">
import { computed } from 'vue'
import type { StoryNarrativeChrome } from '../../../types/storytime/scenes'

const props = defineProps<{
  align?: 'left' | 'center' | 'right'
  debug?: boolean
  component?: any
  componentProps?: Record<string, any>
  html?: string
  chrome?: StoryNarrativeChrome
}>()

const innerClass = computed(() => ({
  'text-left': props.align === 'left' || !props.align,
  'text-center': props.align === 'center',
  'text-right': props.align === 'right',
  'space-y-4': true,
}))

const presentation = computed(() => props.chrome?.presentation || 'split-column')

const isOverlay = computed(() => presentation.value === 'overlay-card' || presentation.value === 'transparent')

const outerClass = computed(() => {
  if (!isOverlay.value) {
    return 'justify-end lg:justify-center'
  }

  const position = props.chrome?.position || 'right'
  const positions: Record<string, string> = {
    left: 'min-h-screen items-center justify-start',
    right: 'min-h-screen items-center justify-end',
    center: 'min-h-screen items-center justify-center',
    'lower-left': 'min-h-screen items-end justify-start pb-16',
    'lower-right': 'min-h-screen items-end justify-end pb-16',
    custom: 'min-h-screen items-center justify-end',
  }

  return positions[position] || positions.right
})

const cardClass = computed(() => [
  innerClass.value,
  {
    'storytime-article-card--overlay': presentation.value === 'overlay-card',
    'storytime-article-card--transparent': presentation.value === 'transparent',
    'storytime-article-card--shape-clipped': props.chrome?.shape === 'clipped-corner',
    'storytime-article-card--shape-angled': props.chrome?.shape === 'angled-edge',
    'storytime-article-card--width-sm': props.chrome?.width === 'sm',
    'storytime-article-card--width-md': !props.chrome?.width || props.chrome?.width === 'md',
    'storytime-article-card--width-lg': props.chrome?.width === 'lg',
    'storytime-article-card--width-xl': props.chrome?.width === 'xl',
  },
])
</script>

<template>
  <div :class="outerClass">
    <div
      :class="cardClass"
      class="storytime-article-card max-w-2xl p-4 bg-[var(--story-narrative-bg)] lg:bg-[transparent] rounded-md border border-[var(--story-narrative-card-border,var(--story-divider))] lg:border-0 text-[var(--story-narrative-text)]"
      data-article-card
    >
      <!-- Priority: component > html > slot -->
      <component v-if="component" :is="component" v-bind="componentProps" />
      <div v-else-if="html" v-html="html" />
      <slot v-else />
    </div>
  </div>
</template>

<style scoped>
.storytime-article-card--overlay {
  --story-narrative-text: var(--story-narrative-card-text);

  width: 100%;
  max-width: var(--story-narrative-card-width, 34rem);
  padding: var(--story-narrative-card-padding, 1.75rem);
  color: var(--story-narrative-card-text, var(--story-narrative-text));
  background:
    color-mix(
      in srgb,
      var(--story-narrative-card-bg, var(--story-narrative-bg)) var(--story-narrative-card-opacity-percent, 100%),
      transparent
    );
  border: 1px solid var(--story-narrative-card-border, var(--story-divider));
  box-shadow: var(--story-narrative-card-shadow, 0 18px 42px rgb(17 17 17 / 18%));
  backdrop-filter: blur(var(--story-narrative-card-blur, 0px));
  pointer-events: auto;
}

.storytime-article-card--transparent {
  --story-narrative-text: var(--story-narrative-card-text);

  width: 100%;
  max-width: var(--story-narrative-card-width, 34rem);
  padding: 0;
  color: var(--story-narrative-card-text, var(--story-narrative-text));
  background: transparent;
  border: 0;
  box-shadow: none;
  pointer-events: auto;
}

.storytime-article-card--shape-clipped {
  border-radius: var(--story-narrative-card-radius, 0.375rem);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 2rem), calc(100% - 2rem) 100%, 0 100%);
}

.storytime-article-card--shape-angled {
  border-radius: var(--story-narrative-card-radius, 0.375rem);
  clip-path: polygon(0 0, 100% 0, 94% 100%, 0 100%);
}

.storytime-article-card--width-sm {
  max-width: 26rem;
}

.storytime-article-card--width-md {
  max-width: 34rem;
}

.storytime-article-card--width-lg {
  max-width: 42rem;
}

.storytime-article-card--width-xl {
  max-width: 52rem;
}
</style>
