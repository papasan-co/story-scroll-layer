/**
 * One share routine for every share affordance in a story — the chapter-nav
 * CTA, the mobile pill, the bottom-bar control. Native share sheet where the
 * platform has one (that is where a reader actually forwards a piece on a
 * phone); copy-link everywhere else. Returns what happened so the caller can
 * set its tracking modifier truthfully: a native share and a copied link are
 * different reach events and should be counted apart.
 */
export type StoryShareOutcome = 'native' | 'copied' | 'dismissed' | 'failed'

export interface StoryShareData {
  title?: string
  text?: string
  url?: string
}

export function supportsNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function shareStory(data: StoryShareData = {}): Promise<StoryShareOutcome> {
  if (typeof window === 'undefined') return 'failed'
  const payload = {
    title: data.title || document.title,
    text: data.text || undefined,
    url: data.url || window.location.href,
  }
  if (supportsNativeShare() && (typeof navigator.canShare !== 'function' || navigator.canShare(payload))) {
    try {
      await navigator.share(payload)
      return 'native'
    } catch (error) {
      // the reader closed the sheet — not a failure, and not a share
      if ((error as { name?: string })?.name === 'AbortError') return 'dismissed'
      // any other native failure falls through to copy
    }
  }
  try {
    await navigator.clipboard.writeText(payload.url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function useStoryShare() {
  return { shareStory, supportsNativeShare }
}
