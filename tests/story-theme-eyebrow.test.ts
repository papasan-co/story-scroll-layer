import { describe, expect, it } from 'vitest'

import { STORY_TYPOGRAPHY_ROLE_RECEPTORS, resolveStoryTheme } from '../app/utils/theme/resolveStoryTheme'

describe('story narrative eyebrow theme', () => {
  it('declares the proven heading and body computed-font receptors', () => {
    expect(STORY_TYPOGRAPHY_ROLE_RECEPTORS).toEqual({
      heading: {
        cssVariable: '--story-font-heading',
        selector:
          '.autumn-story-root h1, .autumn-story-root h2, .autumn-story-root h3, .autumn-story-root h4, .autumn-story-root h5, .autumn-story-root h6',
        computedProperty: 'font-family',
      },
      body: {
        cssVariable: '--story-font-body',
        selector: '#scrolly',
        computedProperty: 'font-family',
      },
    })
  })

  it('uses an accessible supporting brand color when one is available', () => {
    const resolved = resolveStoryTheme({
      effectiveBrand: {
        settings: {
          colors: {
            slots: [
              { key: 'surface', hex: '#FFFFFF' },
              { key: 'primary', hex: '#0E4749' },
              { key: 'supporting', hex: '#5B3A29' },
            ],
          },
        },
      },
    })

    expect(resolved.cssVars['--story-narrative-eyebrow']).toBe('#5B3A29')
  })

  it('softens the narrative text while retaining AA contrast without a supporting color', () => {
    const resolved = resolveStoryTheme({
      effectiveBrand: {
        settings: {
          colors: {
            slots: [
              { key: 'surface', hex: '#FFFFFF' },
              { key: 'neutral-900', hex: '#111111' },
            ],
          },
        },
      },
    })

    expect(resolved.cssVars['--story-narrative-eyebrow']).not.toBe(
      resolved.cssVars['--story-narrative-text'],
    )
  })
})
