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
  empty?: boolean
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

const cardClass = computed(() => {
  if (props.empty) {
    return [
      innerClass.value,
      'max-w-none p-0 bg-transparent rounded-none border-0 text-[var(--story-narrative-text)]',
    ]
  }

  return [
    innerClass.value,
    'storytime-article-card max-w-2xl p-4 rounded-md border border-[var(--story-narrative-card-border,var(--story-divider))] bg-[var(--story-narrative-overlay-bg,var(--story-narrative-bg))] text-[var(--story-narrative-overlay-text,var(--story-narrative-text))] lg:bg-[transparent] lg:text-[var(--story-narrative-text)] lg:border-0',
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
  ]
})
</script>

<template>
  <div :class="outerClass">
    <div
      :class="cardClass"
      data-article-card
      :data-article-empty="props.empty ? 'true' : undefined"
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

/* Below lg the card floats over the visual using the overlay pair, but copy
   blocks hardcode text-[var(--story-narrative-text)] — dark text inside the
   dark overlay card (invisible on phones). Shadow the variable inside the
   card so those classes resolve to the overlay text color; at lg+ the card
   sits in the rail and the narrative color applies untouched. CTA buttons
   use the --story-cta-* pair and are unaffected. */
@media (max-width: 1023.98px) {
  [data-article-card]:not([data-article-empty='true']) {
    --story-narrative-text: var(--story-narrative-overlay-text, #f2f2f2);
  }
}
</style>
