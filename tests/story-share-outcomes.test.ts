import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareStory, supportsNativeShare } from '../app/composables/storytime/useStoryShare'

afterEach(() => vi.unstubAllGlobals())

describe('released native share outcomes', () => {
  it('settles server rendering without a browser or share side effect', async () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('navigator', undefined)
    expect(supportsNativeShare()).toBe(false)
    expect(await shareStory()).toBe('failed')
  })

  it('reports a dismissed native sheet without copying or counting a share', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue({ name: 'AbortError' }), clipboard: { writeText } })
    expect(await shareStory({ url: 'https://example.test/story' })).toBe('dismissed')
    expect(writeText).not.toHaveBeenCalled()
  })

  it.each([false, true])('copies after unsupported payload or native failure (canShare=%s)', async (supported) => {
    const share = vi.fn().mockRejectedValue(new Error('Native share unavailable'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: () => supported, clipboard: { writeText } })
    expect(await shareStory({ url: 'https://example.test/story', title: 'Story' })).toBe('copied')
    expect(share).toHaveBeenCalledTimes(supported ? 1 : 0)
    expect(writeText).toHaveBeenCalledWith('https://example.test/story')
  })

  it('settles clipboard failure honestly when there is no native share', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } })
    expect(await shareStory({ url: 'https://example.test/story' })).toBe('failed')
  })
})
