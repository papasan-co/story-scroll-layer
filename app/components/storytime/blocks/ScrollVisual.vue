<template>
  <figure class="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
    <Transition name="fade" mode="out-in" appear @after-enter="() => emit('ready', sceneKey)">
      <div class="w-full h-full relative">
        <div class="absolute inset-0 z-0 items-center justify-center pointer-events-auto">
          <slot name="background" />
        </div>

        <div
          class="absolute inset-0 z-10 will-change-transform flex items-center justify-center pointer-events-auto"
          style="transform: translateY(var(--parallax-offset))"
        >
          <KeepAlive>
            <slot />
          </KeepAlive>
        </div>
      </div>
    </Transition>
  </figure>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  ready: [string]
}>()

defineProps<{
  sceneKey: string
}>()
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

