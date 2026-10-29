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

  it('applies opt-in chrome colors and detaches the CTA without changing defaults', () => {
    const wrapper = mount(StoryChapterNav, {
      props: {
        chapters: [{ id: 'intro', label: 'Intro', sceneKeys: ['early-ask'] }],
        activeSceneKey: 'early-ask',
        brandMode: 'none',
        backgroundColor: 'rgba(40, 25, 94, 0.7)',
        textColor: 'rgba(255, 255, 255, 0.65)',
        activeBackgroundColor: '#714AF9',
        activeTextColor: '#FFFFFF',
        fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
        borderColor: 'transparent',
        ctaBackgroundColor: '#714AF9',
        ctaTextColor: '#FFFFFF',
        ctaDetached: true,
        cta: { url: '/join', label: 'Join the mailing list' },
      },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
        },
      },
    })

    const nav = wrapper.get('[data-story-chapter-nav]')
    expect(nav.classes()).toContain('story-chapter-nav--cta-detached')
    expect(nav.attributes('style')).toContain('--story-chapter-nav-bg: rgba(40, 25, 94, 0.7)')
    expect(nav.attributes('style')).toContain('--story-chapter-nav-active-bg: #714AF9')
    expect(nav.attributes('style')).toContain('--story-chapter-nav-cta-bg: #714AF9')
    expect(nav.attributes('style')).toContain('font-family: Manrope, ui-sans-serif, system-ui, sans-serif')
    const detachedCta = wrapper.get('.story-chapter-nav + [data-story-chapter-cta]')
    expect(detachedCta.text()).toContain('Join the mailing list')
    expect(detachedCta.get('svg').attributes('viewBox')).toBe('0 0 16 16')
  })

  it('keeps the download glyph for CTAs that download a named file', () => {
    const wrapper = mount(StoryChapterNav, {
      props: {
        chapters: [{ id: 'intro', label: 'Intro', sceneKeys: ['intro'] }],
        activeSceneKey: 'intro',
        cta: {
          url: '/report.pdf',
          label: 'Download report',
          downloadFilename: 'report.pdf',
        },
      },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.get('[data-story-chapter-cta] svg').attributes('viewBox')).toBe('0 0 18 18')
  })
})

describe('chapter nav CTA share action', () => {
  it('renders a share button instead of a link when cta.action is "share"', async () => {
    const { mount } = await import('@vue/test-utils')
    const StoryChapterNav = (await import('../app/components/storytime/StoryChapterNav.vue')).default
    const wrapper = mount(StoryChapterNav, {
      props: {
        chapters: [{ id: 'a', label: 'A', sceneKeys: ['a'] }],
        activeSceneKey: 'a',
        cta: { action: 'share', label: 'Share', trackLabel: 'share', trackModifier: 'share' },
      },
      global: { stubs: { Teleport: { template: '<div><slot /></div>' } } },
    })
    const shareButtons = wrapper.findAll('[data-story-chapter-cta-share]')
    expect(shareButtons.length).toBeGreaterThan(0)
    expect(wrapper.findAll('a[data-story-chapter-cta]').length).toBe(0)
    const btn = shareButtons[0]
    expect(btn.attributes('type')).toBe('button')
    expect(btn.attributes('data-au-track')).toBe('chapter-nav')
    expect(btn.attributes('data-au-label')).toBe('share')
    expect(btn.attributes('data-au-modifier')).toBe('share')
    expect(btn.text()).toContain('Share')
  })

  it('still renders a link when cta.action is absent', async () => {
    const { mount } = await import('@vue/test-utils')
    const StoryChapterNav = (await import('../app/components/storytime/StoryChapterNav.vue')).default
    const wrapper = mount(StoryChapterNav, {
      props: {
        chapters: [{ id: 'a', label: 'A', sceneKeys: ['a'] }],
        activeSceneKey: 'a',
        cta: { url: 'https://example.org', label: 'Go' },
      },
      global: { stubs: { Teleport: { template: '<div><slot /></div>' } } },
    })
    expect(wrapper.findAll('a[data-story-chapter-cta]').length).toBeGreaterThan(0)
    expect(wrapper.findAll('[data-story-chapter-cta-share]').length).toBe(0)
  })
})
