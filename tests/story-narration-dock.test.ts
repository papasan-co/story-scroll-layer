import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import StoryNarrationDock from '../app/components/storytime/controls/StoryNarrationDock.vue'
import StoryScrollyPage from '../app/components/storytime/StoryScrollyPage.vue'
import { normalizeControlsPresentation } from '../app/utils/storytime/presentation'
import { useStoryNarration } from '../app/composables/storytime/useStoryNarration'
import type {
  StoryNarrationTrack,
  StoryScene,
} from '../app/types/storytime/scenes'

const configuration = {
  voiceLabel: 'AI-generated · Marin',
  tracks: [
    {
      sceneKey: 'intro',
      title: 'Introduction',
      src: '/intro.mp3',
      transcript: 'The introduction.',
    },
  ],
}
let wrappers: { unmount: () => void }[] = []
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  })
})
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  wrappers = []
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('optional narration controls', () => {
  it('retains existing defaults, legacy variants and explicit modes', () => {
    expect(normalizeControlsPresentation({}).controlMode).toBe('default')
    expect(normalizeControlsPresentation({ variant: 'we2' }).controlMode).toBe(
      'pill',
    )
    for (const controlMode of ['default', 'minimal', 'pill', 'arrows'] as const)
      expect(normalizeControlsPresentation({ controlMode }).controlMode).toBe(
        controlMode,
      )
    expect(
      normalizeControlsPresentation({
        controlMode: 'narration',
        narration: configuration,
      }).narration,
    ).toEqual(configuration)
  })
  it('selects one shared dock only for the explicit narration mode', () => {
    const scenes: StoryScene[] = [
      {
        key: 'intro',
        sourceKey: 'intro',
        visual: { podSlug: 'hero' },
        articles: [{ blocks: [] }],
      },
    ]
    for (const controlMode of ['pill', 'narration'] as const) {
      const wrapper = mount(StoryScrollyPage, {
        props: {
          scenes,
          presentation: { controls: { controlMode, narration: configuration } },
        },
        global: {
          stubs: {
            ClientOnly: { template: '<div><slot /></div>' },
            ScrollVisual: true,
            BottomActionBar: { template: '<div data-legacy-bar />' },
            StoryNarrationDock: { template: '<div data-narration-bar />' },
          },
        },
      })
      wrappers.push(wrapper)
      expect(wrapper.find('[data-legacy-bar]').exists()).toBe(
        controlMode === 'pill',
      )
      expect(wrapper.find('[data-narration-bar]').exists()).toBe(
        controlMode === 'narration',
      )
    }
  })
  it('keeps navigation and a plain-text transcript when audio is missing or unsafe', async () => {
    const wrapper = mount(StoryNarrationDock, {
      props: {
        narration: {
          tracks: [
            {
              sceneKey: 'intro',
              src: 'javascript:alert(1)',
              transcript: '<script>not markup</script>',
            },
          ],
        },
        sceneKeys: ['intro'],
        sceneIndex: 0,
        total: 2,
        canGoPrevious: false,
        canGoNext: true,
      },
    })
    wrappers.push(wrapper)
    expect(wrapper.find('audio').attributes('src')).toBeUndefined()
    await wrapper.get('[aria-label="Next scene"]').trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.text()).toContain('<script>not markup</script>')
  })
  it('does not let a stale play promise restart audio after the reader pauses', async () => {
    let complete: (() => void) | undefined
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    const track = ref<StoryNarrationTrack | undefined>(configuration.tracks[0])
    let player: ReturnType<typeof useStoryNarration> | undefined
    const wrapper = mount(
      defineComponent({
        setup() {
          player = useStoryNarration(track)
          return {}
        },
        template: '<audio />',
      }),
    )
    wrappers.push(wrapper)
    const audio = wrapper.get('audio').element
    Object.defineProperty(audio, 'paused', {
      configurable: true,
      get: () => false,
    })
    player!.attachAudio(audio)
    const pending = player!.play()
    player!.pause()
    complete?.()
    await pending
    expect(player!.isListening.value).toBe(false)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })
  it('preserves listening intent across scene tracks and hides audio while the page is hidden', async () => {
    const track = ref<StoryNarrationTrack | undefined>(configuration.tracks[0])
    let player: ReturnType<typeof useStoryNarration> | undefined
    const wrapper = mount(
      defineComponent({
        setup() {
          player = useStoryNarration(track)
          return {}
        },
        template: '<audio />',
      }),
    )
    wrappers.push(wrapper)
    const audio = wrapper.get('audio').element
    Object.defineProperty(audio, 'paused', {
      configurable: true,
      get: () => false,
    })
    player!.attachAudio(audio)
    await player!.play()
    track.value = { sceneKey: 'next', src: '/next.mp3' }
    await nextTick()
    await flushPromises()
    expect(audio.src).toContain('/next.mp3')
    expect(player!.isListening.value).toBe(true)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })
})
