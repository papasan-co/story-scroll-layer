/**
 * AUM-497 contract: ArticleCTA's rendered action element must carry
 * `data-au-track="cta"`, `data-au-label`, and `data-au-modifier` so the
 * Autumn tracker bundle can attribute interactions via its delegated
 * click handler. Three action variants — url/modal/scroll — are covered
 * because each renders a distinct element (anchor or button).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ArticleCTA from '../app/components/storytime/blocks/ArticleCTA.vue'

describe('ArticleCTA tracking attributes', () => {
  it('renders canonical eyebrow before headline and falls back to legacy pre', () => {
    const canonical = mount(ArticleCTA, {
      props: { eyebrow: 'Take action', pre: 'Legacy label', headline: 'Start today', caption: 'Choose a path.' },
      global: { stubs: { ClientOnly: true, Teleport: true } },
    })
    const legacy = mount(ArticleCTA, {
      props: { eyebrow: '', pre: 'Legacy label' },
      global: { stubs: { ClientOnly: true, Teleport: true } },
    })

    expect(canonical.findAll('.article-cta-eyebrow')).toHaveLength(1)
    expect(canonical.find('.article-cta-eyebrow').text()).toBe('Take action')
    expect(canonical.text()).not.toContain('Legacy label')
    expect(canonical.find('.article-cta-headline').text()).toBe('Start today')
    expect(canonical.find('.article-cta-caption').text()).toBe('Choose a path.')
    expect(legacy.find('.article-cta-eyebrow').text()).toBe('Legacy label')
  })

  it('marks the URL anchor with data-au-track="cta", label, and modifier="url"', () => {
    const wrapper = mount(ArticleCTA, {
      props: {
        headline: 'Donate today',
        actions: [{ label: 'Give', action: 'url', target: 'https://example.org/donate', style: 'primary' }],
      },
      global: { stubs: { ClientOnly: { template: '<div><slot /></div>' }, Teleport: { template: '<div><slot /></div>' } } },
    })

    const anchor = wrapper.find('a')
    expect(anchor.exists()).toBe(true)
    expect(anchor.attributes('data-au-track')).toBe('cta')
    expect(anchor.attributes('data-au-label')).toBe('Give')
    expect(anchor.attributes('data-au-modifier')).toBe('url')
    expect(anchor.attributes('href')).toBe('https://example.org/donate')
  })

  it('marks the modal button with data-au-modifier="modal"', () => {
    const wrapper = mount(ArticleCTA, {
      props: {
        actions: [{ label: 'Open form', action: 'modal', target: 'https://example.org/embed', style: 'primary' }],
      },
      global: { stubs: { ClientOnly: { template: '<div><slot /></div>' }, Teleport: { template: '<div><slot /></div>' } } },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('data-au-track')).toBe('cta')
    expect(button.attributes('data-au-label')).toBe('Open form')
    expect(button.attributes('data-au-modifier')).toBe('modal')
  })

  it('marks the scroll button with data-au-modifier="scroll"', () => {
    const wrapper = mount(ArticleCTA, {
      props: {
        actions: [{ label: 'Jump to next', action: 'scroll', target: '#scene-2', style: 'secondary' }],
      },
      global: { stubs: { ClientOnly: { template: '<div><slot /></div>' }, Teleport: { template: '<div><slot /></div>' } } },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('data-au-track')).toBe('cta')
    expect(button.attributes('data-au-label')).toBe('Jump to next')
    expect(button.attributes('data-au-modifier')).toBe('scroll')
  })

  it('renders no tracked element when actions is empty', () => {
    const wrapper = mount(ArticleCTA, {
      props: { headline: 'No action here', actions: [] },
      global: { stubs: { ClientOnly: { template: '<div><slot /></div>' }, Teleport: { template: '<div><slot /></div>' } } },
    })

    expect(wrapper.find('[data-au-track]').exists()).toBe(false)
  })

  it('renders card-grid actions with per-action content and tracking metadata', () => {
    const wrapper = mount(ArticleCTA, {
      props: {
        headline: 'Be part of the change',
        caption: 'Choose a path.',
        variant: 'card-grid',
        actions: [
          {
            label: 'Discuss a Partnership',
            action: 'url',
            target: 'https://example.org/partner',
            heading: 'For Employers',
            description: 'Transform your workforce.',
            color: '#004488',
            textColor: '#FFFFFF',
            modifier: 'employer',
          },
          {
            label: 'Invest in MLT',
            action: 'url',
            target: 'https://example.org/donate',
            heading: 'For Donors',
            description: 'Invest in economic mobility.',
            color: '#64C644',
            modifier: 'donor',
          },
        ],
      },
      global: { stubs: { ClientOnly: { template: '<div><slot /></div>' }, Teleport: { template: '<div><slot /></div>' } } },
    })

    expect(wrapper.classes()).toContain('article-cta-root--card-grid')
    expect(wrapper.text()).toContain('For Employers')
    expect(wrapper.text()).toContain('For Donors')
    const anchors = wrapper.findAll('a[data-au-track="cta"]')
    expect(anchors).toHaveLength(2)
    expect(anchors[0].attributes('data-au-label')).toBe('Discuss a Partnership')
    expect(anchors[0].attributes('data-au-modifier')).toBe('employer')
    expect(anchors[0].classes()).toContain('py-3')
    expect(anchors[0].attributes('style')).toContain('--article-cta-action-text: #FFFFFF;')
    expect(anchors[1].attributes('data-au-label')).toBe('Invest in MLT')
    expect(anchors[1].attributes('data-au-modifier')).toBe('donor')
  })
})
