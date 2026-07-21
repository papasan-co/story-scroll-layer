import { describe, expect, it } from 'vitest'

import { resolveStoryTheme } from '../app/utils/theme/resolveStoryTheme'

describe('story narrative eyebrow theme', () => {
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
