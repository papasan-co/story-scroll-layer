import { describe, expect, it } from 'vitest'
import {
  usesDesktopScrollActivation,
  usesMobileScrollActivation,
} from '../app/composables/storytime/useIoScroller'

describe('scroll activation breakpoint', () => {
  it('hands activation to exactly one scroll handler at every width around 1024px', () => {
    for (const width of [767, 1023, 1024, 1025, 1280]) {
      expect(usesMobileScrollActivation(width)).toBe(!usesDesktopScrollActivation(width))
    }
  })

  it('treats exactly 1024px as desktop scroll activation', () => {
    expect(usesMobileScrollActivation(1023)).toBe(true)
    expect(usesDesktopScrollActivation(1024)).toBe(true)
    expect(usesDesktopScrollActivation(1025)).toBe(true)
  })
})
