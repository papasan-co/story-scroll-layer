import { describe, expect, it } from 'vitest'
import {
  normalizeChapterNavPresentation,
  normalizeControlsPresentation,
  normalizeScrollHintPresentation,
  normalizeStoryPresentation,
} from '../app/utils/storytime/presentation'

describe('story presentation normalization', () => {
  it('maps legacy WE-2 chrome variants to generic presentation modes', () => {
    const normalized = normalizeStoryPresentation({
      chapterNav: {
        variant: 'we2',
        brand: { variant: 'we2-mark', label: 'GCERF' },
      },
      controls: { variant: 'we2' },
      scrollHint: { enabled: true, variant: 'we2' },
    })

    expect(normalized.chapterNav?.chromeMode).toBe('floating-rail')
    expect(normalized.chapterNav?.brandMode).toBe('mark')
    expect(normalized.chapterNav?.brand?.mode).toBe('mark')
    expect(normalized.controls?.controlMode).toBe('pill')
    expect(normalized.scrollHint?.mode).toBe('corner')
  })

  it('keeps generic presentation fields unchanged for new migrated stories', () => {
    expect(normalizeChapterNavPresentation({ chromeMode: 'default', brandMode: 'image' })).toMatchObject({
      chromeMode: 'default',
      brandMode: 'image',
    })
    expect(normalizeControlsPresentation({ controlMode: 'arrows' }).controlMode).toBe('arrows')
    expect(normalizeScrollHintPresentation({ mode: 'default' }).mode).toBe('default')
  })

  it('normalizes chapter CTA scene visibility without changing omitted defaults', () => {
    expect(normalizeChapterNavPresentation({
      cta: {
        label: 'Join the mailing list',
        url: 'https://example.com/join',
        sceneKeys: ['scene-two', '', 'scene-three'],
      },
    }).cta?.sceneKeys).toEqual(['scene-two', 'scene-three'])

    expect(normalizeChapterNavPresentation({
      cta: { label: 'Always visible', url: 'https://example.com' },
    }).cta).not.toHaveProperty('sceneKeys')
  })

  it('normalizes chapter navigation scene visibility and preserves explicit chrome colors', () => {
    expect(normalizeChapterNavPresentation({
      sceneKeys: ['scene-two', '', 'scene-three'],
      backgroundColor: 'rgba(40, 25, 94, 0.7)',
      activeBackgroundColor: '#714AF9',
      activeTextColor: '#FFFFFF',
      ctaDetached: true,
    })).toMatchObject({
      sceneKeys: ['scene-two', 'scene-three'],
      backgroundColor: 'rgba(40, 25, 94, 0.7)',
      activeBackgroundColor: '#714AF9',
      activeTextColor: '#FFFFFF',
      ctaDetached: true,
    })
  })
})
