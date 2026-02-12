<script setup lang="ts">
defineProps<{
  /**
   * Small caption text shown under/near media.
   */
  caption?: string
  /**
   * Optional credit/source line (smaller).
   */
  credit?: string
  /**
   * Optional alignment.
   */
  align?: 'left' | 'center' | 'right'
}>()
</script>

<template>
  <div :class="['text-sm leading-snug', align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left']">
    <p v-if="caption" class="text-[var(--story-narrative-text)]/85" v-html="caption" />
    <p v-if="credit" class="text-xs text-[var(--story-narrative-text)]/65 mt-1" v-html="credit" />
  </div>
</template>
