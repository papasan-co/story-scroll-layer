<template>
  <figure class="story-visual-frame sticky top-0 w-full overflow-hidden flex items-center justify-center">
    <Transition
      :name="transitionMode === 'cross-reveal' ? 'cross-reveal' : 'fade'"
      :mode="transitionMode === 'cross-reveal' ? undefined : 'out-in'"
      appear
      @after-enter="() => emit('ready', sceneKey)"
    >
      <div :key="sceneKey" class="w-full h-full relative">
        <div class="absolute inset-0 z-0 items-center justify-center pointer-events-auto">
          <slot name="background" />
        </div>

        <div
          class="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto"
          :class="disableParallax ? '' : 'will-change-transform'"
          :style="disableParallax ? undefined : { transform: 'translateY(var(--parallax-offset))' }"
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
  disableParallax?: boolean
  transitionMode?: 'fade' | 'cross-reveal'
}>()
</script>

<style scoped>
.story-visual-frame {
  height: var(--story-layout-height, 100dvh);
}

@supports (height: 100lvh) {
  .story-visual-frame {
    height: var(--story-layout-height, 100lvh);
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.cross-reveal-enter-active {
  transition: opacity 0.42s ease-in-out;
}

.cross-reveal-enter-from {
  opacity: 0;
}

.cross-reveal-leave-active {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0s linear 0.42s;
}

.cross-reveal-leave-to {
  opacity: 0;
}
</style>
