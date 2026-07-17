import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { h } from 'vue'
import StoryTimedPathPage from '../app/components/storytime/StoryTimedPathPage.vue'
import {
  buildTimedPathSceneGroups,
  buildTimedPathSequence,
  resolveTimedPathChapterTarget,
} from '../app/utils/storytime/timedPath'
import type { StoryTimedPathStep } from '../app/types/storytime/scenes'

const steps: StoryTimedPathStep[] = [
  { id: 'hero-1-id', key: 'hero-1', sourceKey: 'source-hero-1', sceneKey: 'hero', sceneLabel: 'Intro', type: 'hero', durationMs: 1000, title: 'Hero one' },
  { key: 'hero-2', sceneKey: 'hero', sceneLabel: 'Intro', type: 'hero', durationMs: 1000, title: 'Hero two' },
  {
    key: 'choice',
    sceneKey: 'choice',
    sceneLabel: 'Choose',
    type: 'choice',
    durationMs: 0,
    choices: [
      { key: 'invest', label: 'Invest' },
      { key: 'business', label: 'Business' },
    ],
  },
  { key: 'invest-1', sceneKey: 'residents', sceneLabel: 'Residents', type: 'invest-step', durationMs: 1000, title: 'Invest' },
  { key: 'business-1', sceneKey: 'businesses', sceneLabel: 'Businesses', type: 'invest-step', durationMs: 1000, title: 'Business' },
  { key: 'cta', sceneKey: 'cta', sceneLabel: 'CTA', type: 'cta', durationMs: 0, title: 'CTA' },
]

const paths = {
  invest: ['hero', 'choice', 'residents', 'cta'],
  business: ['hero', 'choice', 'businesses', 'cta'],
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('timed path helpers', () => {
  it('builds the pre-choice sequence until a path is selected', () => {
    expect(buildTimedPathSequence(steps, paths, null)).toEqual([0, 1, 2])
  })

  it('builds the selected path sequence by scene group', () => {
    expect(buildTimedPathSequence(steps, paths, 'business')).toEqual([0, 1, 2, 4, 5])
  })

  it('builds scene groups from an active sequence', () => {
    expect(buildTimedPathSceneGroups(steps, [0, 1, 2, 4, 5])).toEqual([
      { key: 'hero', label: 'Intro', positions: [0, 1] },
      { key: 'choice', label: 'Choose', positions: [2] },
      { key: 'businesses', label: 'Businesses', positions: [3] },
      { key: 'cta', label: 'CTA', positions: [4] },
    ])
  })

  it('resolves chapter targets within the active sequence', () => {
    expect(resolveTimedPathChapterTarget({ key: 'businesses', label: 'Business' }, steps, [0, 1, 2, 4, 5])).toBe(4)
    expect(resolveTimedPathChapterTarget({ key: 'residents', label: 'Residents' }, steps, [0, 1, 2, 4, 5])).toBeNull()
  })
})

describe('StoryTimedPathPage', () => {
  it('renders tracking markers for the active timed-path step', () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: { steps, paths },
        controls: false,
        lockBodyScroll: false,
      },
    })

    const section = wrapper.get('[data-au-scene-flow="timed-path"]')
    expect(section.attributes('data-au-scene-id')).toBe('hero-1-id')
    expect(section.attributes('data-au-scene-index')).toBe('0')
    expect(section.attributes('data-au-source-key')).toBe('source-hero-1')
    expect(section.attributes('data-au-step-key')).toBe('hero-1')
  })

  it('advances with keyboard and does not auto-advance on choice steps', async () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: { steps, paths },
        controls: false,
        lockBodyScroll: false,
      },
    })

    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[data-au-step-key]').attributes('data-au-step-key')).toBe('hero-2')

    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[data-au-step-key]').attributes('data-au-step-key')).toBe('choice')

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.get('[data-au-step-key]').attributes('data-au-step-key')).toBe('choice')
  })

  it('chooses a path and advances into that path', async () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: { steps, paths },
        controls: false,
        lockBodyScroll: false,
      },
    })

    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.get('[data-au-modifier="path:business"]').trigger('click')

    expect(wrapper.emitted('pathChange')?.[0]).toEqual(['business'])
    expect(wrapper.get('[data-au-step-key]').attributes('data-au-step-key')).toBe('business-1')
  })

  it('exposes unexplored timed-path targets and can jump to them generically', async () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: { steps, paths },
        controls: false,
        lockBodyScroll: false,
      },
      slots: {
        visual: ({ choosePath, exploreMore, jumpToScene }) => h('div', [
          h('button', {
            class: 'choose-business',
            onClick: () => choosePath('business'),
          }, 'Choose business'),
          h('button', {
            class: 'jump-unexplored',
            onClick: () => jumpToScene(exploreMore[0]?.key),
          }, exploreMore.map((target: { label: string }) => target.label).join(',')),
        ]),
      },
    })

    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.get('.choose-business').trigger('click')

    expect(wrapper.get('[data-au-step-key]').attributes('data-au-step-key')).toBe('business-1')
    expect(wrapper.get('.jump-unexplored').text()).toBe('Residents')

    await wrapper.get('.jump-unexplored').trigger('click')

    expect(wrapper.emitted('pathChange')?.at(-1)).toEqual(['invest'])
    expect(wrapper.get('[data-au-step-key]').attributes('data-au-step-key')).toBe('invest-1')
  })

  it('renders generic progress controls without client-named hooks', () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: {
          steps,
          paths,
          initialPath: null,
          controls: { showProgress: true },
        },
        lockBodyScroll: false,
      },
    })

    expect(wrapper.get('[data-au-flow-mode="timed-path"]').exists()).toBe(true)
    expect(wrapper.find('[class*="mne"]').exists()).toBe(false)
    expect(wrapper.find('[class*="we2"]').exists()).toBe(false)
    expect(wrapper.find('[data-story-timed-path-progress]').exists()).toBe(true)
  })

  it('renders the generic modal chapter menu with counts and active state', async () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: {
          steps,
          paths,
          chapters: [
            { key: 'hero', label: 'Introduction', sceneKeys: ['hero'] },
            { key: 'businesses', label: 'For businesses', sceneKeys: ['businesses'] },
          ],
          controls: {
            chapterMenuMode: 'modal-list',
            chapterMenuTitle: 'Chapters',
            showChapterMenu: true,
          },
        },
        lockBodyScroll: false,
      },
    })

    await wrapper.get('[data-au-modifier="chapters"]').trigger('click')

    const menu = wrapper.get('[data-story-timed-path-menu]')
    expect(menu.attributes('data-story-timed-path-menu-mode')).toBe('modal-list')
    expect(menu.get('.story-timed-path-menu__title').text()).toBe('Chapters')
    expect(menu.get('.story-timed-path-menu__item--active .story-timed-path-menu__name').text()).toBe('Introduction')
    expect(menu.text()).toContain('2 slides')
  })

  it('renders timed-path media when imported media tokens resolve to media objects', () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: {
          steps: [
            {
              key: 'video-step',
              sceneKey: 'video',
              sceneLabel: 'Video',
              type: 'hero',
              durationMs: 0,
              media: {
                kind: 'video',
                src: {
                  src: 'mne/stories/mne/videos/MNE_intro_before.mp4',
                  directUrl: 'http://127.0.0.1:5110/mne/stories/mne/videos/MNE_intro_before.mp4',
                  url: 'https://autumn-cms.s3.amazonaws.com/mne/stories/mne/videos/MNE_intro_before.mp4',
                  s3Key: 'mne/stories/mne/videos/MNE_intro_before.mp4',
                },
              },
            },
          ],
        },
        controls: false,
        lockBodyScroll: false,
      },
    })

    expect(wrapper.get('video').attributes('src')).toBe('http://127.0.0.1:5110/mne/stories/mne/videos/MNE_intro_before.mp4')
  })

  it('renders a media overlay from generic timed-path media metadata', () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: {
          steps: [
            {
              key: 'video-step',
              sceneKey: 'video',
              sceneLabel: 'Video',
              type: 'hero',
              durationMs: 0,
              media: {
                kind: 'video',
                src: '/video.mp4',
                overlay: 'rgba(0, 0, 0, 0.25)',
              },
            },
          ],
        },
        controls: false,
        lockBodyScroll: false,
      },
    })

    expect(wrapper.get('.story-timed-path-bg__overlay').attributes('style')).toContain('rgba(0, 0, 0, 0.25)')
  })

  it('exposes the active media background as a generic CSS variable', () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: {
          steps: [
            {
              key: 'split-video',
              sceneKey: 'split',
              sceneLabel: 'Split',
              type: 'reason',
              layout: 'split',
              durationMs: 0,
              media: {
                kind: 'video',
                src: '/video.mp4',
                background: '#08090f',
              },
            },
          ],
        },
        controls: false,
        lockBodyScroll: false,
      },
    })

    expect(wrapper.get('[data-au-flow-mode="timed-path"]').attributes('style')).toContain('--story-active-media-bg: #08090f')
  })

  it('can render top icon controls and scene-local step dots', () => {
    const wrapper = mount(StoryTimedPathPage, {
      props: {
        timedPath: {
          steps,
          paths,
          controls: {
            controlMode: 'top-icons',
            showProgress: true,
            showLocation: true,
            showChapterMenu: true,
            showStepDots: true,
          },
          chapters: [
            { key: 'hero', label: 'Intro', sceneKeys: ['hero'] },
          ],
        },
        lockBodyScroll: false,
      },
    })

    expect(wrapper.find('[data-story-timed-path-topbar]').exists()).toBe(true)
    expect(wrapper.find('.story-timed-path-icon-controls').exists()).toBe(true)
    expect(wrapper.find('.story-timed-path-controls').exists()).toBe(false)
    expect(wrapper.find('[data-story-timed-path-step-dots]').exists()).toBe(true)
  })
})
