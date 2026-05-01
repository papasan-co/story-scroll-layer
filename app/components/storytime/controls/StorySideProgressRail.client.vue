<script setup lang="ts">
/**
 * Optional vertical step indicators for story playback / scroll mode (story chrome — not pod internals).
 */
defineProps<{
  activeIndex: number
  total: number
}>()
</script>

<template>
  <div
    v-if="total > 0"
    class="pointer-events-none fixed right-3 top-1/2 z-[60] hidden -translate-y-1/2 flex-col items-center gap-1.5 md:flex"
    aria-hidden="true"
  >
    <span
      v-for="i in total"
      :key="i"
      class="h-1.5 w-1.5 rounded-full border transition-[background] duration-200"
      :class="
        i - 1 === activeIndex
          ? 'border-[var(--story-controls-text)] bg-[var(--story-controls-text)]'
          : 'border-[var(--story-controls-divider)] bg-transparent'
      "
    />
  </div>
</template>
