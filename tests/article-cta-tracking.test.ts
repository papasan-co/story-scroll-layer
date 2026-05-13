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
})
