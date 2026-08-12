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

/*
 * Bar-overlay compensation (see updateBarShiftVar in StoryScrollyPage).
 * On-device testing showed top-bar browsers displace the STUCK STICKY
 * visual right along with in-flow content during the URL-bar animation —
 * not just the narrative — so the visual gets the same counter-translate.
 * The frame is 100lvh tall while the visible viewport is lvh−Δ with the
 * bar shown, so lifting by Δ keeps the visible area fully covered: the
 * spare Δpx tucks above the screen. Transform on the sticky element
 * itself is safe (only transformed ANCESTORS break sticky).
 */
@media (max-width: 1023.98px) {
  .story-visual-frame {
    transform: translate3d(0, calc(var(--story-bar-shift, 0px) * -1), 0);
  }
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
