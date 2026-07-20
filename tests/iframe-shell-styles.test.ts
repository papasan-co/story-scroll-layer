import { describe, expect, it } from 'vitest'
import { storytimeIframeShellStylesheets } from '../app/utils/storytime/iframeShellStyles'

describe('storytime iframe shell styles', () => {
  it('exports the structural scrolly contract for isolated preview documents', () => {
    expect(storytimeIframeShellStylesheets).toHaveLength(1)
    expect(storytimeIframeShellStylesheets[0]).toContain('storytime.css')
  })
})
