import { describe, expect, it } from 'vitest'
import { storytimeIframeShellStylesheets } from '../app/utils/storytime/iframeShellStyles'

describe('storytime iframe shell styles', () => {
  it('exports layout and chapter navigation styles for isolated preview documents', () => {
    expect(storytimeIframeShellStylesheets.map(href => new URL(href).pathname.split('/').pop())).toEqual([
      'storytime.css',
      'story-chapter-nav.css',
    ])
  })
})
