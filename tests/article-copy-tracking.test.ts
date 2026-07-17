import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ArticleCopy from '../app/components/storytime/blocks/ArticleCopy.vue'

const globalStubs = {
  ClientOnly: { template: '<div><slot /></div>' },
  Teleport: { template: '<div><slot /></div>' },
}

describe('ArticleCopy CTA tracking attributes', () => {
  it('marks URL CTAs with delegated tracker attributes', () => {
    const wrapper = mount(ArticleCopy, {
      props: {
        cta: {
          label: 'Read the report',
          action: 'url',
          target: 'https://example.org/report',
          color: '#00274F',
          textColor: '#FFFFFF',
        },
      },
      global: { stubs: globalStubs },
    })

    const anchor = wrapper.find('a[data-au-track="cta"]')
    expect(anchor.exists()).toBe(true)
    expect(anchor.attributes('data-au-label')).toBe('Read the report')
    expect(anchor.attributes('data-au-modifier')).toBe('url')
    expect(anchor.attributes('href')).toBe('https://example.org/report')
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toBe('noopener noreferrer')
    expect(anchor.classes()).toContain('self-start')
    expect(anchor.attributes('style')).toContain('--article-copy-cta-bg: #00274F')
    expect(anchor.attributes('style')).toContain('--article-copy-cta-text: #FFFFFF')
  })

  it('marks modal CTAs with delegated tracker attributes', () => {
    const wrapper = mount(ArticleCopy, {
      props: {
        cta: { label: 'Open form', action: 'modal', target: 'https://example.org/embed' },
      },
      global: { stubs: globalStubs },
    })

    const button = wrapper.find('button[data-au-track="cta"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('data-au-label')).toBe('Open form')
    expect(button.attributes('data-au-modifier')).toBe('modal')
  })

  it('marks scroll CTAs with delegated tracker attributes', () => {
    const wrapper = mount(ArticleCopy, {
      props: {
        cta: { label: 'Jump ahead', action: 'scroll', target: '#next-scene' },
      },
      global: { stubs: globalStubs },
    })

    const button = wrapper.find('button[data-au-track="cta"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('data-au-label')).toBe('Jump ahead')
    expect(button.attributes('data-au-modifier')).toBe('scroll')
    expect(button.text()).toBe('Jump ahead')
  })

  it('does not mark reference links as CTA interactions', () => {
    const wrapper = mount(ArticleCopy, {
      props: {
        refLink: { label: 'Source', url: 'https://example.org/source' },
      },
      global: { stubs: globalStubs },
    })

    expect(wrapper.find('.ac-ref-link').attributes('data-au-track')).toBeUndefined()
  })
})
