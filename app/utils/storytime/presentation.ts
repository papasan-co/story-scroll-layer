import type {
  StoryChapterNavBrandMode,
  StoryChapterNavChromeMode,
  StoryChapterNavPresentation,
  StoryControlsMode,
  StoryControlsPresentation,
  StoryPresentation,
  StoryScrollHintMode,
  StoryScrollHintPresentation,
} from '../../types/storytime/scenes'

function isChapterNavChromeMode(value: unknown): value is StoryChapterNavChromeMode {
  return value === 'default' || value === 'floating-rail'
}

function isBrandMode(value: unknown): value is StoryChapterNavBrandMode {
  return value === 'text' || value === 'image' || value === 'mark' || value === 'none'
}

function isControlsMode(value: unknown): value is StoryControlsMode {
  return value === 'default' || value === 'minimal' || value === 'pill' || value === 'arrows'
}

function isScrollHintMode(value: unknown): value is StoryScrollHintMode {
  return value === 'default' || value === 'corner'
}

export function normalizeChapterNavPresentation(
  presentation: StoryChapterNavPresentation | null | undefined,
): StoryChapterNavPresentation {
  const value = { ...(presentation || {}) }
  const legacyWe2 = value.variant === 'we2'
  const brand = value.brand ? { ...value.brand } : undefined
  const requestedBrandMode = brand?.mode ?? value.brandMode ?? brand?.variant

  value.chromeMode = isChapterNavChromeMode(value.chromeMode)
    ? value.chromeMode
    : legacyWe2
      ? 'floating-rail'
      : 'default'

  value.brandMode = isBrandMode(value.brandMode)
    ? value.brandMode
    : requestedBrandMode === 'we2-mark'
      ? 'mark'
      : isBrandMode(requestedBrandMode)
        ? requestedBrandMode
        : undefined

  if (brand) {
    brand.mode = isBrandMode(brand.mode)
      ? brand.mode
      : brand.variant === 'we2-mark'
        ? 'mark'
        : isBrandMode(brand.variant)
          ? brand.variant
          : value.brandMode

    value.brand = brand
  }

  return value
}

export function normalizeControlsPresentation(
  presentation: StoryControlsPresentation | null | undefined,
): StoryControlsPresentation {
  const value = { ...(presentation || {}) }
  const legacyVariant = value.variant

  value.controlMode = isControlsMode(value.controlMode)
    ? value.controlMode
    : legacyVariant === 'we2'
      ? 'pill'
      : legacyVariant === 'minimal'
        ? 'minimal'
        : 'default'

  return value
}

export function normalizeScrollHintPresentation(
  presentation: StoryScrollHintPresentation | null | undefined,
): StoryScrollHintPresentation {
  const value = { ...(presentation || {}) }

  value.mode = isScrollHintMode(value.mode)
    ? value.mode
    : value.variant === 'we2'
      ? 'corner'
      : 'default'

  return value
}

export function normalizeStoryPresentation(
  presentation: StoryPresentation | null | undefined,
): StoryPresentation {
  const value = { ...(presentation || {}) }

  value.chapterNav = normalizeChapterNavPresentation(value.chapterNav)
  value.controls = normalizeControlsPresentation(value.controls)
  value.scrollHint = normalizeScrollHintPresentation(value.scrollHint)

  return value
}
