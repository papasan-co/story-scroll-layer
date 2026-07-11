<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  align?: 'left' | 'center' | 'right'
  debug?: boolean
  component?: any
  componentProps?: Record<string, any>
  html?: string
  empty?: boolean
}>()

const innerClass = computed(() => ({
  'text-left': props.align === 'left' || !props.align,
  'text-center': props.align === 'center',
  'text-right': props.align === 'right',
  'space-y-4': true,
}))
</script>

<template>
  <div class="justify-end lg:justify-center">
    <!--
      Below lg the narrative floats over the visual, so it uses the overlay
      pair: the visual pair inverted (contrast is symmetric, so the inverted
      pair keeps the same AA ratio, and its background contrasts with the
      visual surface by construction). At lg+ the narrative sits in its own
      rail — transparent, borderless, story narrative colors.
    -->
    <div
      :class="[
        innerClass,
        props.empty
          ? 'max-w-none p-0 bg-transparent rounded-none border-0 text-[var(--story-narrative-text)]'
          : 'max-w-2xl p-4 rounded-md bg-[var(--story-narrative-overlay-bg,var(--story-narrative-bg))] text-[var(--story-narrative-overlay-text,var(--story-narrative-text))] lg:bg-[transparent] lg:text-[var(--story-narrative-text)]',
      ]"
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
