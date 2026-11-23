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
type DialogView = 'transcript' | 'reader' | 'options'
const dialogView = ref<DialogView>('transcript')
const readingAll = computed(() => dialogView.value === 'reader')
const readingOptions = computed(() => dialogView.value === 'options')
const dialogTitle = computed(() => {
  if (readingOptions.value) return 'Reading & accessibility'
  if (readingAll.value) return 'Read the full story'
  return `Transcript: ${title.value}`
})
let opener: HTMLElement | null = null
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
async function openDialog(view: DialogView, trigger?: HTMLElement) {
  opener = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  dialogView.value = view
  if (view !== 'options') narrationPlayer.pause()
  await nextTick()
  transcript.value?.showModal()
}
function listenToScene() {
  closeTranscript()
  void narrationPlayer.play()
}
function closeTranscript() {
  transcript.value?.close()
}
async function restoreTranscriptFocus() {
  await nextTick()
  const trigger = opener?.isConnected ? opener : (readingAll.value ? readerButton.value : transcriptButton.value)
  opener = null
  dialogView.value = 'transcript'
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
function reportHeight() {
  emit('height', Math.ceil(root.value?.getBoundingClientRect().height || 0))
}
onMounted(() => {
  narrationPlayer.attachAudio(audio.value)
  emit('audioReady', audio.value)
  // Scene links need the available height before the first resize observation.
  reportHeight()
  observer = new ResizeObserver(reportHeight)
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => {
  emit('audioReady', null)
  observer?.disconnect()
  emit('height', 0)
})
defineExpose({
  openReader: () => openDialog('reader'),
  openOptions: (trigger: HTMLElement) => openDialog('options', trigger),
  play: narrationPlayer.play,
  pause: narrationPlayer.pause,
})
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
          @ended="!readingOptions && track?.advanceOnEnd && canGoNext && navigate('next')"
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
          @click="openDialog('transcript')"
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
            <button v-if="narration?.tracks?.length" ref="readerButton" type="button" @click="openDialog('reader')">Read the full story</button>
            <slot name="options" />
          </div>
        </details>
      </div>
    </div>
    <span class="story-narration-dock__sr-only" role="status">{{
      shareStatus
    }}</span>
    <dialog
      :aria-label="dialogTitle"
      ref="transcript"
      :class="{
        'story-narration-dock__reader': readingAll,
        'story-narration-dock__options-dialog': readingOptions,
      }"
      class="story-narration-dock__transcript"
      @close="restoreTranscriptFocus"
      @keydown.stop
    >
      <template v-if="readingOptions">
        <div class="story-narration-dock__dialog-heading">
          <h2>Reading &amp; accessibility</h2>
          <button type="button" aria-label="Close accessibility options" @click="closeTranscript">×</button>
        </div>
        <p>Read at your own pace, reduce motion, or listen to this scene.</p>
        <div class="story-narration-dock__dialog-actions">
          <button v-if="track?.src" type="button" @click="listenToScene">Listen to this scene</button>
          <button v-if="canControlAnimations" type="button" @click="toggleAnimations">
            {{ animationsPlaying ? 'Pause animations' : 'Resume animations' }}
          </button>
        </div>
        <p v-if="narration?.voiceLabel">{{ narration.voiceLabel }}</p>
        <details v-if="track?.transcript" open>
          <summary>Current narration transcript</summary>
          <p>{{ track.transcript }}</p>
        </details>
        <details v-if="narration?.tracks?.length">
          <summary>Complete narration transcript</summary>
          <section v-for="item in narration.tracks" :key="item.sceneKey">
            <h3>{{ item.title }}</h3>
            <p>{{ item.transcript }}</p>
          </section>
        </details>
      </template>
      <template v-else-if="readingAll">
        <h2>Read the full story</h2>
        <button type="button" @click="closeTranscript">Return to interactive story</button>
        <slot name="reader">
        <section v-for="item in narration?.tracks" :key="item.sceneKey">
          <h3>{{ item.title }}</h3><p>{{ item.transcript }}</p>
        </section>
        </slot>
      </template>
      <template v-else><h2>{{ title }}</h2><p>{{ track?.transcript }}</p></template>
      <button v-if="!readingOptions" type="button" @click="closeTranscript">Close transcript</button>
    </dialog>
  </aside>
</template>

<style src="../../../assets/css/story-narration-dock.css"></style>
