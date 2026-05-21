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
import { describe, it, expect } from 'vitest'
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

describe('StoryScrollyPage tracking attributes', () => {
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
