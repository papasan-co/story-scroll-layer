<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  type Ref,
} from 'vue'
import { useStoryNarration } from '../../../composables/storytime/useStoryNarration'
import { shareStory } from '../../../composables/storytime/useStoryShare'
import type { StoryNarrationPresentation } from '../../../types/storytime/scenes'

interface AnimationControls {
  play?: () => unknown
  pause?: () => unknown
  isPlaying?: boolean | Ref<boolean>
}
const props = withDefaults(
  defineProps<{
    narration?: StoryNarrationPresentation
    sceneKeys: string[]
    sceneIndex: number
    total: number
    canGoPrevious: boolean
    canGoNext: boolean
    showShare?: boolean
    activeVisual?: AnimationControls | null
  }>(),
  { narration: undefined, showShare: true, activeVisual: null },
)
const emit = defineEmits<{ previous: []; next: []; audioReady: [element: HTMLAudioElement | null]; height: [value: number] }>()
const root = ref<HTMLElement | null>(null)
const audio = ref<HTMLAudioElement | null>(null)
const transcript = ref<HTMLDialogElement | null>(null)
const transcriptButton = ref<HTMLButtonElement | null>(null)
const more = ref<HTMLDetailsElement | null>(null)
const shareStatus = ref('')
let observer: ResizeObserver | undefined
const selectedTrack = computed(() =>
  props.narration?.tracks?.find((track) =>
    props.sceneKeys.includes(track.sceneKey),
  ),
)
const track = computed(() => {
  if (!selectedTrack.value) return undefined
  const { recording, src: legacySrc } = selectedTrack.value
  const src = [recording?.directUrl, recording?.src, recording?.url, legacySrc]
    .filter((candidate): candidate is string => typeof candidate === 'string')
    .map(candidate => candidate.trim())
    .find(candidate => /^(https?:\/\/|\/(?!\/))/i.test(candidate))
  return {
    ...selectedTrack.value,
    src,
  }
})
const readingAll = ref(false)
const readerButton = ref<HTMLButtonElement | null>(null)
const title = computed(
  () => track.value?.title || `Scene ${props.sceneIndex + 1}`,
)
const progress = computed(() =>
  props.total ? Math.round(((props.sceneIndex + 1) / props.total) * 100) : 0,
)
const canControlAnimations = computed(
  () =>
    typeof props.activeVisual?.play === 'function' &&
    typeof props.activeVisual?.pause === 'function',
)
const animationsPlaying = computed(() => !!unref(props.activeVisual?.isPlaying))
const narrationPlayer = useStoryNarration(track)
const { rate, errorMessage } = narrationPlayer
function showTranscript(all = false) {
  readingAll.value = all
  narrationPlayer.pause()
  transcript.value?.showModal()
}
function closeTranscript() {
  transcript.value?.close()
}
async function restoreTranscriptFocus() {
  await nextTick()
  const trigger = readingAll.value ? readerButton.value : transcriptButton.value
  trigger?.focus({ preventScroll: true })
}
function toggleAnimations() {
  if (animationsPlaying.value) props.activeVisual?.pause?.()
  else props.activeVisual?.play?.()
  if (more.value) more.value.open = false
}
async function share() {
  const outcome = await shareStory({ title: document.title })
  shareStatus.value =
    outcome === 'copied'
      ? 'Link copied.'
      : outcome === 'failed'
        ? 'Sharing is unavailable.'
        : ''
  if (more.value) more.value.open = false
}
function navigate(direction: 'previous' | 'next') {
  if (direction === 'previous') emit('previous')
  else emit('next')
}
onMounted(() => {
  narrationPlayer.attachAudio(audio.value)
  emit('audioReady', audio.value)
  observer = new ResizeObserver(() =>
    emit('height', Math.ceil(root.value?.getBoundingClientRect().height || 0)),
  )
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => {
  emit('audioReady', null)
  observer?.disconnect()
  emit('height', 0)
})
defineExpose({ play: narrationPlayer.play, pause: narrationPlayer.pause })
</script>

<template>
  <aside
    ref="root"
    class="story-narration-dock"
    data-story-controls
    data-story-controls-mode="narration"
    aria-label="Story narration and navigation"
    @keydown.stop
  >
    <div class="story-narration-dock__progress" aria-hidden="true">
      <span :style="{ width: progress + '%' }" />
    </div>
    <div class="story-narration-dock__inner">
      <div class="story-narration-dock__scene">
        <div class="story-narration-dock__arrows">
          <button
            type="button"
            aria-label="Previous scene"
            :disabled="!canGoPrevious"
            data-story-control="previous"
            data-au-track="story-control"
            data-au-label="Previous scene"
            data-au-modifier="previous"
            @click="navigate('previous')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 15 6-6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next scene"
            :disabled="!canGoNext"
            data-story-control="next"
            data-au-track="story-control"
            data-au-label="Next scene"
            data-au-modifier="next"
            @click="navigate('next')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        <div class="story-narration-dock__title">
          <span
            >{{ String(sceneIndex + 1).padStart(2, '0') }} / {{ total }}</span
          ><strong>{{ title }}</strong>
        </div>
      </div>
      <div class="story-narration-dock__audio">
        <div class="story-narration-dock__credit">
          Narration
          <span v-if="narration?.voiceLabel">{{ narration.voiceLabel }}</span>
        </div>
        <audio
          v-show="track?.src"
          ref="audio"
          @ended="track?.advanceOnEnd && canGoNext && navigate('next')"
          controls
          preload="metadata"
          :aria-label="`Narration: ${title}`"
          data-au-track="story-control"
          data-au-label="Narration"
          data-au-modifier="narration"
        />
        <p v-if="!track?.src" class="story-narration-dock__status">
          No recording for this scene. Continue exploring or read the
          transcript.
        </p>
        <p
          v-if="errorMessage"
          class="story-narration-dock__status"
          role="status"
        >
          {{ errorMessage }}
        </p>
      </div>
      <div class="story-narration-dock__options">
        <label v-if="track?.src"
          ><span class="story-narration-dock__sr-only">Narration speed</span
          ><select v-model="rate" aria-label="Narration speed">
            <option :value="0.75">0.75×</option>
            <option :value="1">1×</option>
            <option :value="1.25">1.25×</option>
            <option :value="1.5">1.5×</option>
          </select></label
        >
        <button
          ref="transcriptButton"
          type="button"
          :disabled="!track?.transcript"
          data-au-track="story-control"
          data-au-label="Transcript"
          data-au-modifier="transcript"
          @click="showTranscript(false)"
        >
          Transcript
        </button>
        <details
          v-if="showShare || canControlAnimations || narration?.tracks?.length || $slots.options"
          ref="more"
          class="story-narration-dock__more"
        >
          <summary aria-label="More story options">•••</summary>
          <div class="story-narration-dock__menu">
            <button
              v-if="showShare"
              type="button"
              data-story-control="share"
              data-au-track="story-control"
              data-au-label="Share story"
              data-au-modifier="share"
              @click="share"
            >
              Share story
            </button>
            <button
              v-if="canControlAnimations"
              type="button"
              data-au-track="story-control"
              data-au-label="Animation preferences"
              data-au-modifier="animation"
              @click="toggleAnimations"
            >
              {{ animationsPlaying ? 'Pause animations' : 'Resume animations' }}
            </button>
            <button v-if="narration?.tracks?.length" ref="readerButton" type="button" @click="showTranscript(true)">Read the full story</button>
            <slot name="options" />
          </div>
        </details>
      </div>
    </div>
    <span class="story-narration-dock__sr-only" role="status">{{
      shareStatus
    }}</span>
    <dialog
      ref="transcript"
      class="story-narration-dock__transcript"
      :aria-label="readingAll ? 'Full story transcript' : `Transcript: ${title}`"
      @close="restoreTranscriptFocus"
      @keydown.stop
    >
      <template v-if="readingAll">
        <h2>Full story transcript</h2>
        <section v-for="item in narration?.tracks" :key="item.sceneKey">
          <h3>{{ item.title }}</h3><p>{{ item.transcript }}</p>
        </section>
      </template>
      <template v-else><h2>{{ title }}</h2><p>{{ track?.transcript }}</p></template>
      <button type="button" @click="closeTranscript">Close transcript</button>
    </dialog>
  </aside>
</template>

<style scoped>
.story-narration-dock {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 100;
  background: var(--story-controls-bg, #fff);
  color: var(--story-controls-text, #1c1e4d);
  box-shadow: 0 -5px 24px #11182712;
  font-family: var(--story-font-heading, Arial, sans-serif);
}
.story-narration-dock__progress {
  height: 3px;
  background: var(--story-controls-divider, #e8edf0);
}
.story-narration-dock__progress > span {
  display: block;
  height: 100%;
  background: var(--story-controls-progress, #c14318);
  transition: width 0.3s;
}
.story-narration-dock__inner {
  max-width: 1500px;
  margin: auto;
  padding: 14px 28px calc(14px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(280px, 1.4fr) auto;
  gap: 24px;
  align-items: center;
}
.story-narration-dock__scene {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.story-narration-dock__arrows {
  display: flex;
  gap: 4px;
}
.story-narration-dock__arrows button {
  height: 44px;
  width: 36px;
  padding: 8px;
  border: 1px solid #dce1e8;
  border-radius: 6px;
}
.story-narration-dock__arrows svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}
.story-narration-dock__title {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.story-narration-dock__title > span {
  font-size: 10px;
  letter-spacing: 0.12em;
}
.story-narration-dock__title strong {
  font-size: 14px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.story-narration-dock__credit {
  font-size: 11px;
  font-weight: 650;
  margin-bottom: 5px;
}
.story-narration-dock__credit > span {
  font-size: 10px;
  color: inherit;
  opacity: 0.75;
  margin-left: 7px;
  font-weight: 400;
}
.story-narration-dock audio {
  display: block;
  width: 100%;
  height: 40px;
}
.story-narration-dock__options {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.story-narration-dock button,
.story-narration-dock select,
.story-narration-dock summary {
  font: inherit;
  color: inherit;
  cursor: pointer;
  touch-action: manipulation;
}
.story-narration-dock__options button,
.story-narration-dock select,
.story-narration-dock summary {
  min-height: 44px;
  padding: 9px;
}
.story-narration-dock button {
  background: transparent;
}
.story-narration-dock button:disabled {
  opacity: 0.4;
  cursor: default;
}
.story-narration-dock button:not(:disabled):hover,
.story-narration-dock summary:hover {
  background: #cbd5e133;
  border-radius: 5px;
}
.story-narration-dock :is(button, summary, select):focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 2px;
}
.story-narration-dock__more {
  position: relative;
}
.story-narration-dock summary {
  list-style: none;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
}
.story-narration-dock summary::-webkit-details-marker {
  display: none;
}
.story-narration-dock__menu {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  min-width: 210px;
  padding: 8px;
  border: 1px solid #dce1e8;
  border-radius: 8px;
  background: var(--story-controls-bg, #fff);
  box-shadow: 0 8px 25px #11182720;
  display: flex;
  flex-direction: column;
}
.story-narration-dock__menu button {
  text-align: left;
}
.story-narration-dock__status {
  font-size: 12px;
  line-height: 1.5;
  margin: 4px 0;
}
.story-narration-dock__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.story-narration-dock__transcript {
  margin: auto;
  width: min(620px, calc(100% - 32px));
  max-height: calc(100svh - 32px);
  overflow: auto;
  padding: 28px;
  border: 1px solid #dce1e8;
  border-radius: 10px;
  background: var(--story-controls-bg, #fff);
  color: var(--story-controls-text, #1c1e4d);
}
.story-narration-dock__transcript::backdrop {
  background: #11123488;
}
.story-narration-dock__transcript h2 {
  font-size: 24px;
  font-weight: 650;
}
.story-narration-dock__transcript p {
  line-height: 1.7;
  margin: 20px 0;
  white-space: pre-line;
}
.story-narration-dock__transcript button {
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid currentColor;
  border-radius: 5px;
}
@media (max-width: 1050px) {
  .story-narration-dock__inner {
    grid-template-columns: minmax(190px, 1fr) minmax(240px, 1.4fr);
    gap: 12px;
    padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
  }
  .story-narration-dock__options {
    grid-column: 1/-1;
    justify-content: flex-end;
  }
}
@media (max-width: 650px) {
  .story-narration-dock__inner {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  }
  .story-narration-dock__scene {
    justify-content: space-between;
    flex-direction: row-reverse;
  }
  .story-narration-dock__options {
    grid-column: auto;
    justify-content: flex-end;
    gap: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .story-narration-dock__progress > span {
    transition: none;
  }
}
@media (max-width:650px) {
  .story-narration-dock .story-narration-dock__inner {
    grid-template-columns:auto minmax(0,1fr) auto;
    grid-template-areas:"arrows position options" "audio audio audio";
    gap:6px 10px;
    padding:8px 12px calc(8px + env(safe-area-inset-bottom));
  }
  .story-narration-dock .story-narration-dock__scene {display:contents;}
  .story-narration-dock .story-narration-dock__arrows {grid-area:arrows;}
  .story-narration-dock .story-narration-dock__title {grid-area:position;align-self:center;}
  .story-narration-dock .story-narration-dock__title > span {font-size:12px;font-weight:600;letter-spacing:.08em;}
  .story-narration-dock .story-narration-dock__options {grid-area:options;gap:0;}
  .story-narration-dock .story-narration-dock__audio {grid-area:audio;}
  .story-narration-dock :is(.story-narration-dock__title strong,.story-narration-dock__credit) {
    position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;
  }
  .story-narration-dock .story-narration-dock__options :is(button,select,summary) {padding:9px 7px;}
}
</style>
