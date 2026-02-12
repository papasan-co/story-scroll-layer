<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  align?: 'left' | 'center' | 'right'
  debug?: boolean
  component?: any
  componentProps?: Record<string, any>
  html?: string
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
    <div
      :class="innerClass"
      class="max-w-2xl p-4 bg-[var(--story-narrative-bg)] lg:bg-[transparent] rounded-md border border-[var(--story-narrative-card-border,var(--story-divider))] lg:border-0 text-[var(--story-narrative-text)]"
      data-article-card
    >
      <!-- Priority: component > html > slot -->
      <component v-if="component" :is="component" v-bind="componentProps" />
      <div v-else-if="html" v-html="html" />
      <slot v-else />
    </div>
  </div>
</template>
