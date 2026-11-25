import { describe, expect, it } from 'vitest'

import {
  buildArtDirectedSources,
  buildAwsImageUrl,
  buildResponsiveImageAttrs,
  decodeAwsImageUrl,
  imageDeliveryCandidateWidths,
  imageDeliveryPresetFor,
  imageDeliveryPresetForMedia,
} from '../app/utils/media/imageDeliveryContract'

describe('shared image delivery contract', () => {
  it('reserves 2560px and quality 90 for full visual walls', () => {
    expect(imageDeliveryPresetFor('full')).toBe('visual-wall')
    expect(imageDeliveryCandidateWidths('visual-wall')).toContain(2560)
    expect(imageDeliveryCandidateWidths('hero')).not.toContain(2560)
    expect(imageDeliveryCandidateWidths('content')).not.toContain(2560)

    const attrs = buildResponsiveImageAttrs({
      preset: 'visual-wall',
      urlFor: (width, options) => `${width}-${options.quality}-${options.maxWidth}`,
    })
    expect(attrs.src).toBe('2560-90-2560')
    expect(attrs.srcset).toContain('2560-90-2560 2560w')
    expect(attrs.sizes).toBe('100vw')
    expect(attrs.fit).toBe('cover')
  })

  it('uses the same responsive breakpoints for sizing as for crops', () => {
    const attrs = buildResponsiveImageAttrs({ preset: 'card', urlFor: width => `/sample-${width}.jpg` })
    expect(attrs.sizes).toBe('(max-width: 639px) 100vw, (min-width: 640px) and (max-width: 1023px) 50vw, 33vw')

    const crop = { x: 0, y: 0, width: 1600, height: 1200 }
    const sources = buildArtDirectedSources({
      preset: 'card',
      crops: { mobile: crop },
      urlFor: width => `/sample-${width}.jpg`,
    })
    expect(sources.find(source => source.kind === 'mobile')?.srcset).toContain('1280w')
  })

  it('uses the same deterministic Papasan request envelope for every host', () => {
    const url = buildAwsImageUrl({
      baseURL: 'https://images.papasan.co',
      bucket: 'autumn-cms-staging',
      key: 'shes-well-networked/stories/still-ours-to-build/hero.jpg',
      modifiers: { width: 2560, maxWidth: 2560, quality: 90, fit: 'cover', format: 'webp' },
    })
    expect(decodeAwsImageUrl(url)).toMatchObject({
      edits: {
        resize: { width: 2560, fit: 'cover' },
        webp: { quality: 90 },
      },
    })
  })

  it('normalizes host-provided format aliases before building responsive URLs', () => {
    const attrs = buildResponsiveImageAttrs({
      preset: 'content',
      format: 'jpg' as 'jpeg',
      urlFor: (_width, options) => options.format,
    })

    expect(attrs.format).toBe('jpeg')
    expect(attrs.src).toBe('jpeg')
  })

  it('classifies resolved viewport-cover media as a visual wall across host boundaries', () => {
    expect(imageDeliveryPresetForMedia({ preset: 'hero', sizes: '100vw', fit: 'cover' })).toBe('visual-wall')
    expect(imageDeliveryPresetForMedia({ preset: 'hero', sizes: '100vw', fit: 'contain' })).toBe('hero')
    expect(imageDeliveryPresetForMedia({ preset: 'inline', roles: ['full-bleed'] })).toBe('visual-wall')
  })
})
