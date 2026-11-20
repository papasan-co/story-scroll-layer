import { onBeforeUnmount, onMounted, readonly, ref, watch, type Ref } from 'vue'
import type { StoryNarrationTrack } from '../../types/storytime/scenes'

/** Owns one user-started audio session; scene selection and scrolling stay with the story runtime. */
export function useStoryNarration(
  track: Readonly<Ref<StoryNarrationTrack | undefined>>,
) {
  const rate = ref(1)
  const errorMessage = ref('')
  const isListening = ref(false)
  let audio: HTMLAudioElement | null = null
  let requestId = 0
  let controlledPauses = 0
  let pendingPlays = 0

  function pauseMedia() {
    if (audio && !audio.paused) {
      controlledPauses++
      audio.pause()
    }
  }
  async function play() {
    if (!audio || !track.value?.src || document.visibilityState !== 'visible')
      return
    const currentRequest = ++requestId
    isListening.value = true
    errorMessage.value = ''
    if (audio.ended) audio.currentTime = 0
    pendingPlays++
    try {
      await audio.play()
      // Overlapping successful play promises must not cancel a newer desired play.
      if (!isListening.value || document.visibilityState !== 'visible')
        pauseMedia()
    } catch (error) {
      if (
        currentRequest !== requestId ||
        (error instanceof DOMException && error.name === 'AbortError')
      )
        return
      isListening.value = false
      errorMessage.value =
        'Press play to start narration. The transcript is also available.'
    } finally {
      pendingPlays--
    }
  }
  function pause() {
    requestId++
    isListening.value = false
    pauseMedia()
  }
  function onPlay() {
    if (pendingPlays === 0) isListening.value = true
  }
  function onPause() {
    if (controlledPauses > 0) {
      controlledPauses--
      return
    }
    if (!audio?.ended) isListening.value = false
  }
  function onRateChange() {
    if (audio) rate.value = audio.playbackRate
  }
  function onError() {
    isListening.value = false
    errorMessage.value =
      'This recording could not be loaded. You can read its transcript and continue through the story.'
  }
  function loadTrack() {
    requestId++
    pauseMedia()
    errorMessage.value = ''
    if (!audio) return
    if (!track.value?.src) {
      audio.removeAttribute('src')
      audio.load()
      return
    }
    audio.src = track.value.src
    audio.defaultPlaybackRate = rate.value
    audio.load()
    audio.playbackRate = rate.value
    if (isListening.value) void play()
  }
  function attachAudio(element: HTMLAudioElement | null) {
    if (audio) {
      pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ratechange', onRateChange)
    }
    audio = element
    controlledPauses = 0
    if (!audio) return
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)
    audio.addEventListener('ratechange', onRateChange)
    loadTrack()
  }
  function updateVisibility() {
    if (document.visibilityState !== 'visible') {
      requestId++
      pauseMedia()
    } else if (isListening.value) void play()
  }
  watch(() => track.value?.src, loadTrack, { flush: 'post' })
  watch(rate, (value) => {
    if (audio) {
      audio.defaultPlaybackRate = value
      audio.playbackRate = value
    }
  })
  onMounted(() =>
    document.addEventListener('visibilitychange', updateVisibility),
  )
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', updateVisibility)
    attachAudio(null)
  })
  return {
    rate,
    errorMessage: readonly(errorMessage),
    isListening: readonly(isListening),
    attachAudio,
    play,
    pause,
  }
}
