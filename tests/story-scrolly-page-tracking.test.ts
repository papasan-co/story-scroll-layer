/**
 * AUM-497 contract: StoryScrollyPage must emit `data-au-scene-id` and
 * `data-au-scene-index` on each `.step` element so the Autumn tracker
 * bundle can run IntersectionObserver over them to fire `scene_view` /
 * `scene_dwell`.
 *
 * Multiple `.step` elements may share the same id when one scene has
 * multiple narrative beats — the tracker is responsible for deduping
 * by id within a session, not the layer.
 */
import { afterEach, describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StoryScrollyPage from '../app/components/storytime/StoryScrollyPage.vue'
import type { StoryScene } from '../app/types/storytime/scenes'

const scenes: StoryScene[] = [
  {
    id: 'aaaaaaaa-1111-1111-1111-111111111111',
    key: 'scene-one',
    sourceKey: 'source-scene-one',
    layout: 'split',
    visual: { podSlug: 'hero', props: {} },
    articles: [
      { align: 'left', blocks: [{ type: 'copy', props: { paragraphs: ['Intro paragraph one'] } }] },
      { align: 'left', blocks: [{ type: 'copy', props: { paragraphs: ['Intro paragraph two'] } }] },
    ],
  },
  {
    id: 'bbbbbbbb-2222-2222-2222-222222222222',
    key: 'scene-two',
    sourceKey: 'source-scene-two',
    layout: 'split',
    visual: { podSlug: 'cta-panel', props: {} },
    articles: [
      { align: 'left', blocks: [{ type: 'copy', props: { paragraphs: ['Second scene narrative'] } }] },
    ],
  },
]

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
})

describe('StoryScrollyPage tracking attributes', () => {
  it('passes responsive jump alignment to the controls chrome', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 834 })

    const wrapper = mount(StoryScrollyPage, {
      props: {
        scenes,
        presentation: {
          controls: {
            jumpAlign: 'center',
            responsiveJumpAlign: [{ maxWidth: 1100, value: 'end' }],
            responsiveJumpEndOffsetPx: [{ maxWidth: 1100, value: 96 }],
            jumpTarget: 'card',
          },
        },
      },
      global: {
        stubs: {
          ScrollVisual: { template: '<div><slot /></div>' },
          BottomActionBar: {
            props: ['jumpAlign', 'jumpEndOffsetPx', 'jumpTarget'],
            template: '<div data-testid="bottom-action-bar" :data-jump-align="jumpAlign" :data-jump-end-offset-px="jumpEndOffsetPx" :data-jump-target="jumpTarget" />',
          },
          ClientOnly: { template: '<div><slot /></div>' },
        },
      },
    })

    const actionBar = wrapper.get('[data-testid="bottom-action-bar"]')
    expect(actionBar.attributes('data-jump-align')).toBe('end')
    expect(actionBar.attributes('data-jump-end-offset-px')).toBe('96')
    expect(actionBar.attributes('data-jump-target')).toBe('card')
  })

  it('switches to viewport-stack card mode through generic responsive metadata', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 })

    const wrapper = mount(StoryScrollyPage, {
      props: {
        scenes: [
          {
            id: 'cccccccc-3333-3333-3333-333333333333',
            key: 'responsive-scene',
            layout: 'split',
            cardMode: 'side-by-side',
            responsiveCardMode: 'viewport-stack',
            responsiveBreakpoint: 1100,
            visual: { podSlug: 'responsive-visual', props: {} },
            articles: [
              { align: 'right', blocks: [{ type: 'copy', props: { paragraphs: ['Responsive paragraph'] } }] },
            ],
          },
        ],
        controls: false,
      },
      global: {
        stubs: {
          ScrollVisual: { template: '<div><slot /></div>' },
          BottomActionBar: { template: '<div />' },
          ClientOnly: { template: '<div><slot /></div>' },
        },
      },
    })

    const scrolly = wrapper.get('#scrolly')
    expect(scrolly.attributes('data-au-card-mode')).toBe('viewport-stack')
    expect(scrolly.attributes('data-au-force-viewport-card-stack')).toBe('true')
  })

  it('emits data-au-scene-id and data-au-scene-index on every step', () => {
    const wrapper = mount(StoryScrollyPage, {
      props: { scenes, controls: false },
      global: {
        stubs: {
          ScrollVisual: { template: '<div data-testid="scroll-visual"><slot /></div>' },
          BottomActionBar: { template: '<div />' },
          ClientOnly: { template: '<div><slot /></div>' },
        },
      },
    })

    const steps = wrapper.findAll('.step')
    expect(steps.length).toBe(3)

    expect(steps[0].attributes('data-au-scene-id')).toBe('aaaaaaaa-1111-1111-1111-111111111111')
    expect(steps[0].attributes('data-au-scene-index')).toBe('0')
    expect(steps[1].attributes('data-au-scene-id')).toBe('aaaaaaaa-1111-1111-1111-111111111111')
    expect(steps[1].attributes('data-au-scene-index')).toBe('0')
    expect(steps[2].attributes('data-au-scene-id')).toBe('bbbbbbbb-2222-2222-2222-222222222222')
    expect(steps[2].attributes('data-au-scene-index')).toBe('1')
  })

  it('renders leading standalone scenes before the scrolly shell while preserving source scene indexes', () => {
    const wrapper = mount(StoryScrollyPage, {
      props: {
        scenes: [
          {
            id: 'cccccccc-3333-3333-3333-333333333333',
            key: 'standalone-cover',
            sourceKey: 'cover',
            flow: 'standalone',
            layout: 'full',
            visual: { podSlug: 'cover', props: {} },
            articles: [
              { align: 'left', blocks: [{ type: 'copy', props: { paragraphs: ['Cover placeholder'] } }] },
            ],
          },
          {
            id: 'dddddddd-4444-4444-4444-444444444444',
            key: 'first-scrolly',
            sourceKey: 'narrative',
            layout: 'split',
            visual: { podSlug: 'narrative', props: {} },
            articles: [
              { align: 'left', blocks: [{ type: 'copy', props: { paragraphs: ['Narrative paragraph'] } }] },
            ],
          },
        ],
        controls: false,
      },
      global: {
        stubs: {
          ScrollVisual: { template: '<div data-testid="scroll-visual"><slot /></div>' },
          BottomActionBar: { template: '<div />' },
          ClientOnly: { template: '<div><slot /></div>' },
        },
      },
    })

    const standalone = wrapper.get('[data-au-scene-flow="standalone"]')
    expect(standalone.attributes('data-au-scene-id')).toBe('cccccccc-3333-3333-3333-333333333333')
    expect(standalone.attributes('data-au-scene-index')).toBe('0')
    expect(standalone.attributes('data-au-source-key')).toBe('cover')
    expect(standalone.element.nextElementSibling?.id).toBe('scrolly')
    expect(wrapper.find('[data-testid="scroll-visual"]').exists()).toBe(false)

    const steps = wrapper.findAll('.step')
    expect(steps.length).toBe(1)
    expect(steps[0].attributes('data-au-scene-id')).toBe('dddddddd-4444-4444-4444-444444444444')
    expect(steps[0].attributes('data-au-scene-index')).toBe('1')
    expect(steps[0].attributes('data-au-source-key')).toBe('narrative')
  })

  it('renders a visual-only standalone opener without synthesizing narrative steps', () => {
    const wrapper = mount(StoryScrollyPage, {
      props: {
        scenes: [
          {
            id: 'eeeeeeee-5555-5555-5555-555555555555',
            key: 'visual-only-cover',
            sourceKey: 'visual-only-cover',
            flow: 'standalone',
            layout: 'full',
            cardMode: 'hidden',
            visual: { podSlug: 'hero', props: {} },
            articles: [],
          },
        ],
        controls: false,
      },
      slots: {
        visual: '<div data-testid="visual-only-cover" />',
      },
      global: {
        stubs: {
          ScrollVisual: { template: '<div data-testid="scroll-visual"><slot /></div>' },
          BottomActionBar: { template: '<div />' },
          ClientOnly: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.get('[data-au-scene-flow="standalone"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="visual-only-cover"]')).toBeTruthy()
    expect(wrapper.findAll('.step')).toHaveLength(0)
    expect(wrapper.find('[data-testid="scroll-visual"]').exists()).toBe(false)
  })

  it('defers the scrolly visual when standalone scenes arrive after initial render', async () => {
    const wrapper = mount(StoryScrollyPage, {
      props: { scenes: [], controls: false },
      global: {
        stubs: {
          ScrollVisual: { template: '<div data-testid="scroll-visual"><slot /></div>' },
          BottomActionBar: { template: '<div />' },
          ClientOnly: { template: '<div><slot /></div>' },
        },
      },
    })

    await wrapper.setProps({
      scenes: [
        {
          id: 'cccccccc-3333-3333-3333-333333333333',
          key: 'standalone-cover',
          sourceKey: 'cover',
          flow: 'standalone',
          layout: 'full',
          visual: { podSlug: 'cover', props: {} },
          articles: [
            { align: 'left', blocks: [{ type: 'copy', props: { paragraphs: ['Cover placeholder'] } }] },
          ],
        },
        {
          id: 'dddddddd-4444-4444-4444-444444444444',
          key: 'first-scrolly',
          sourceKey: 'narrative',
          layout: 'split',
          visual: { podSlug: 'narrative', props: {} },
          articles: [
            { align: 'left', blocks: [{ type: 'copy', props: { paragraphs: ['Narrative paragraph'] } }] },
          ],
        },
      ],
    })

    expect(wrapper.get('[data-au-scene-flow="standalone"]').attributes('data-au-source-key')).toBe('cover')
    expect(wrapper.find('[data-testid="scroll-visual"]').exists()).toBe(false)
  })

  it('preserves the legacy data-scene-key attribute', () => {
    const wrapper = mount(StoryScrollyPage, {
      props: { scenes, controls: false },
      global: {
        stubs: {
          ScrollVisual: { template: '<div><slot /></div>' },
          BottomActionBar: { template: '<div />' },
          ClientOnly: { template: '<div><slot /></div>' },
        },
      },
    })

    const steps = wrapper.findAll('.step')
    expect(steps[0].attributes('data-scene-key')).toBe('scene-one')
    expect(steps[0].attributes('data-au-source-key')).toBe('source-scene-one')
    expect(steps[2].attributes('data-scene-key')).toBe('scene-two')
    expect(steps[2].attributes('data-au-source-key')).toBe('source-scene-two')
  })
})
