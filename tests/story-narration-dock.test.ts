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
  it('opens reading options on the current scene, with the full reader available by choice', async () => {
    const wrapper = mount(StoryScrollyPage, {
      attachTo: document.body,
      props: {
        scenes: [{ key: 'intro', sourceKey: 'intro', articles: [{ blocks: [] }] }],
        disableChromeTeleport: true,
        presentation: {
          navMode: 'chapter-nav',
          chapters: [{ id: 'start', label: 'Start', sceneKeys: ['intro'] }],
          chapterNav: { cta: { url: '#story-narration-options', label: 'Read / listen' } },
          controls: { controlMode: 'narration', narration: configuration },
        },
      },
      slots: { visual: '<div data-visual-in-reader />' },
      global: {
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          ScrollVisual: true,
        },
      },
    })
    wrappers.push(wrapper)
    const initialHash = location.hash
    const trigger = wrapper.get('button[data-story-chapter-cta]')
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    await trigger.trigger('click')
    await flushPromises()
    const dialog = wrapper.get('dialog')
    expect(dialog.element.open).toBe(true)
    expect(dialog.attributes('aria-label')).toBe('Reading & accessibility')
    expect(dialog.text()).toContain('The introduction.')
    expect(dialog.text()).toContain('Complete narration transcript')
    const reduceMotion = dialog.get('input[role="switch"]')
    await reduceMotion.setValue(true)
    expect(wrapper.get('[data-story-controls]').attributes('data-reduced-motion')).toBe('true')
    await reduceMotion.setValue(false)
    expect(wrapper.get('[data-story-controls]').attributes('data-reduced-motion')).toBeUndefined()
    expect(dialog.find('[data-visual-in-reader]').exists()).toBe(false)
    await dialog.get('button[aria-label="Close accessibility options"]').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(trigger.element)
    expect(location.hash).toBe(initialHash)
    const reader = wrapper.findAll('button').find((button) => button.text() === 'Read the full story')
    expect(reader).toBeDefined()
    await reader!.trigger('click')
    await flushPromises()
    expect(dialog.attributes('aria-label')).toBe('Read the full story')
    expect(dialog.find('[data-visual-in-reader]').exists()).toBe(true)
  })
  it('starts from the cover during the click and plays through in scene order', async () => {
    const narration = {
      tracks: [
        { sceneKey: 'intro', src: '/intro.mp3' },
        { sceneKey: 'cover', src: '/cover.mp3' },
        { sceneKey: 'last', src: '/last.mp3' },
      ],
    }
    const playedSources: (string | null)[] = []
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(function (this: HTMLMediaElement) {
      playedSources.push(this.getAttribute('src'))
      return Promise.resolve()
    })
    const storySceneKeys = [['cover'], ['intro'], ['last']]
    const jumpToScene = vi.fn((key: string) => {
      void wrapper.setProps({ sceneKeys: [key], sceneIndex: storySceneKeys.findIndex(keys => keys.includes(key)) })
      return true
    })
    const wrapper = mount(StoryNarrationDock, {
      attachTo: document.body,
      props: {
        narration,
        sceneKeys: ['last'],
        sceneIndex: 2,
        total: 3,
        canGoPrevious: true,
        canGoNext: true,
        storySceneKeys,
        jumpToScene,
      },
    })
    wrappers.push(wrapper)
    await wrapper.vm.$.exposed!.openOptions()
    wrapper.get('.story-narration-dock__listen-story').element.click()
    expect(playedSources).toEqual(['/cover.mp3'])
    await flushPromises()
    const audio = wrapper.get('audio')
    await wrapper.vm.$.exposed!.openOptions()
    await audio.trigger('ended')
    expect(wrapper.get('dialog').element.open).toBe(true)
    await audio.trigger('ended')
    await audio.trigger('ended')
    expect(jumpToScene.mock.calls).toEqual([['cover'], ['intro'], ['last']])
    expect(playedSources).toEqual(['/cover.mp3', '/intro.mp3', '/last.mp3'])
    await wrapper.setProps({ sceneKeys: ['intro'], sceneIndex: 1 })
    expect(playedSources).toHaveLength(3)
  })
  it.each([
    ['story', 'click'],
    ['story', 'ArrowDown'],
    ['dock', 'click'],
  ])('advances to the third scene during the cover handoff (%s, %s)', async (mode, gesture) => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const keys = ['cover', 'intro', 'third']
    const wrapper = mount(StoryScrollyPage, {
      attachTo: document.body,
      props: {
        scenes: keys.map((key): StoryScene => ({
          key,
          flow: key === 'cover' ? 'standalone' : undefined,
          articles: [{ blocks: [] }],
        })),
        presentation: {
          scroll: { introExitTarget: 'scrolly-start', introExitDurationMs: 800 },
          controls: {
            controlMode: 'narration',
            narration: {
              tracks: keys.map(key => ({ sceneKey: key, src: `/${key}.mp3`, advanceOnEnd: key === 'cover' })),
            },
          },
        },
      },
      global: {
        stubs: { ClientOnly: { template: '<div><slot /></div>' }, ScrollVisual: true },
      },
    })
    wrappers.push(wrapper)
    for (const step of wrapper.findAll('.step')) {
      Object.defineProperty(step.element, 'offsetParent', { value: document.body })
    }
    vi.spyOn(wrapper.get('.story-standalone-scene').element, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 500, window.innerHeight))
    const audio = wrapper.get('audio')
    const down = wrapper.get<HTMLButtonElement>('[aria-label="Next scene"]')
    const playedSources: (string | null)[] = []
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(function (this: HTMLMediaElement) {
      const src = this.getAttribute('src')
      playedSources.push(src)
      if (src === '/intro.mp3') {
        if (gesture === 'click') down.element.click()
        else down.element.dispatchEvent(new KeyboardEvent('keydown', { key: gesture, bubbles: true }))
      }
      return Promise.resolve()
    })

    if (mode === 'story') {
      await wrapper.getComponent(StoryNarrationDock).vm.$.exposed!.openOptions()
      await wrapper.get('.story-narration-dock__listen-story').trigger('click')
    } else {
      await wrapper.get('[aria-label="Play narration"]').trigger('click')
    }
    expect(audio.attributes('src')).toBe('/cover.mp3')

    await audio.trigger('ended')
    await flushPromises()
    expect(playedSources).toEqual(['/cover.mp3', '/intro.mp3', '/third.mp3'])
    expect(wrapper.get('.story-narration-dock__title').text()).toContain('03 / 3')
  })
  it('leaves audio paused when the reader navigates before the ended event', async () => {
    const wrapper = mount(StoryNarrationDock, {
      attachTo: document.body,
      props: {
        narration: {
          tracks: [{ sceneKey: 'cover', src: '/cover.mp3' }, { sceneKey: 'intro', src: '/intro.mp3' }],
        },
        sceneKeys: ['cover'],
        sceneIndex: 0,
        total: 2,
        canGoPrevious: false,
        canGoNext: true,
        storySceneKeys: [['cover'], ['intro']],
        jumpToScene: () => true,
      },
    })
    wrappers.push(wrapper)
    await wrapper.vm.$.exposed!.openOptions()
    await wrapper.get('.story-narration-dock__listen-story').trigger('click')
    Object.defineProperty(wrapper.get('audio').element, 'ended', { configurable: true, value: true })
    await wrapper.setProps({ sceneKeys: ['intro'], sceneIndex: 1 })
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  })
  it('plays the current scene without advancing past the end', async () => {
    const wrapper = mount(StoryNarrationDock, {
      attachTo: document.body,
      props: {
        narration: { tracks: [{ sceneKey: 'cover', src: '/cover.mp3', advanceOnEnd: true }] },
        sceneKeys: ['cover'],
        sceneIndex: 0,
        total: 2,
        canGoPrevious: false,
        canGoNext: true,
      },
    })
    wrappers.push(wrapper)
    await wrapper.vm.$.exposed!.openOptions()
    await wrapper.get('.story-narration-dock__dialog-actions button').trigger('click')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    await wrapper.get('audio').trigger('ended')
    expect(wrapper.emitted('next')).toBeUndefined()
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
    expect(wrapper.find('[aria-label="Play narration"]').exists()).toBe(false)
    await wrapper.get('[aria-label="Next scene"]').trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.text()).toContain('<script>not markup</script>')
  })
  it('keeps the playback button in sync with the native recording', async () => {
    const wrapper = mount(StoryNarrationDock, {
      props: {
        narration: configuration,
        sceneKeys: ['intro'],
        sceneIndex: 0,
        total: 2,
        canGoPrevious: false,
        canGoNext: true,
      },
    })
    wrappers.push(wrapper)
    const audio = wrapper.get('audio')
    await wrapper.get('[aria-label="Play narration"]').trigger('click')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()

    Object.defineProperty(audio.element, 'paused', { configurable: true, value: false })
    await audio.trigger('play')
    await wrapper.get('[aria-label="Pause narration"]').trigger('click')
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce()

    await audio.trigger('pause')
    expect(wrapper.find('[aria-label="Play narration"]').exists()).toBe(true)
    await audio.trigger('play')
    await audio.trigger('ended')
    expect(wrapper.find('[aria-label="Play narration"]').exists()).toBe(true)
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
