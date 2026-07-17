import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StoryChapterNav from '../app/components/storytime/StoryChapterNav.vue'

describe('StoryChapterNav presentation', () => {
  it('renders a generic brand image when provided', () => {
    const wrapper = mount(StoryChapterNav, {
      props: {
        chapters: [{ id: 'pain', label: 'Pain', sceneKeys: ['empathy'] }],
        activeSceneKey: 'empathy',
        brand: {
          variant: 'image',
          label: 'Marico Consulting',
          logoUrl: 'https://cdn.example.com/logo-horizontal.png',
          sceneKeys: ['hero'],
        },
      },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
        },
      },
    })

    const image = wrapper.get('img.story-chapter-nav__brand-image--desktop')
    expect(image.attributes('src')).toBe('https://cdn.example.com/logo-horizontal.png')
    expect(wrapper.get('.story-chapter-nav__brand').attributes('data-au-track')).toBe('chapter-nav')
    expect(wrapper.get('[data-story-chapter-brand]').exists()).toBe(true)
    expect(wrapper.get('[data-story-chapter-brand]').classes()).not.toContain('story-chapter-nav__chip')
  })

  it('does not mark the first chapter active when the active scene is outside the chapter list', () => {
    const wrapper = mount(StoryChapterNav, {
      props: {
        chapters: [{ id: 'pain', label: 'Pain', sceneKeys: ['empathy'] }],
        activeSceneKey: 'hero',
        inactiveLabel: 'Intro',
        brand: {
          variant: 'image',
          label: 'Marico Consulting',
          logoUrl: 'https://cdn.example.com/logo-horizontal.png',
          sceneKeys: ['hero'],
        },
      },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.get('.story-chapter-nav__current').text()).toBe('Intro')
    expect(wrapper.get('.story-chapter-nav__chip:not(.story-chapter-nav__brand):not(.story-chapter-nav__current)').classes()).not.toContain('is-active')
  })

  it('can use the first chapter as the inactive current chapter', () => {
    const wrapper = mount(StoryChapterNav, {
      props: {
        chapters: [
          { id: 'foreword', label: 'Foreword', sceneKeys: ['foreword'] },
          { id: 'results', label: 'Results', sceneKeys: ['results'] },
        ],
        activeSceneKey: 'cover',
        inactiveBehavior: 'first-chapter',
        brand: { mode: 'mark', label: 'Brand', sceneKeys: ['cover'] },
      },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.get('.story-chapter-nav__current').text()).toBe('Foreword')
    expect(wrapper.get('[data-story-chapter-item]').classes()).toContain('is-active')
  })

  it('renders generic semantic hooks for every chrome role', () => {
    const wrapper = mount(StoryChapterNav, {
      props: {
        chapters: [
          {
            id: 'services',
            label: 'Services',
            sceneKeys: ['accounting'],
            children: [{ id: 'hr', label: 'HR', sceneKeys: ['hr'] }],
          },
        ],
        activeSceneKey: 'accounting',
        chromeMode: 'floating-rail',
        brand: { mode: 'mark', label: 'Brand', sceneKeys: ['hero'] },
        cta: { url: '/download.pdf', label: 'Download' },
      },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.get('[data-story-chapter-nav]').attributes('data-story-chapter-chrome-mode')).toBe('floating-rail')
    expect(wrapper.get('[data-story-chapter-brand]').attributes('data-story-chapter-brand-mode')).toBe('mark')
    expect(wrapper.get('[data-story-chapter-item]').attributes('data-au-track')).toBe('chapter-nav')
    expect(wrapper.get('[data-story-chapter-cta]').attributes('data-au-track')).toBe('chapter-nav')
    expect(wrapper.get('[data-story-chapter-toggle]').exists()).toBe(true)
  })
})
