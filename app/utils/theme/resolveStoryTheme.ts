export type ThemeColorRef = {
  source: 'brand' | 'custom'
  slot_key?: string | null
  hex?: string | null
}

export const STORY_THEME_COLOR_KEYS = [
  'visual_background',
  'visual_text',
  'narrative_background',
  'narrative_text',
  'cta_background',
  'cta_text',
] as const

export type StoryThemeColorKey = (typeof STORY_THEME_COLOR_KEYS)[number]

export type StoryTheme = {
  colors?: Partial<Record<StoryThemeColorKey, ThemeColorRef | null>> | {
    // Legacy local payload fallback support.
    background?: ThemeColorRef | null
    text?: ThemeColorRef | null
    button?: ThemeColorRef | null
  } | null
  typography?: {
    heading_font_id?: string | null
    body_font_id?: string | null
  } | null
} | null

export type BrandFontLike = {
  id?: string | null
  uuid?: string | null
  family?: string | null
  provider?: string | null
  external_url?: string | null
  weights?: number[] | null
}

export type BrandLike = {
  slug?: string | null
  css_path?: string | null
  settings?: {
    colors?: {
      slots?: Array<{ key?: string | null; hex?: string | null }>
    }
  } | null
  tokens?: {
    color?: Record<string, string>
  } | Record<string, unknown> | null
}

export type ResolveStoryThemeInput = {
  effectiveBrand?: BrandLike | null
  storyTheme?: StoryTheme
  sceneThemeOverrides?: StoryTheme
  brandFonts?: BrandFontLike[]
}

export type ResolveStoryThemeResult = {
  cssVars: Record<string, string>
  stylesheets: string[]
}

const FALLBACK_SURFACE = '#FFFFFF'
const FALLBACK_INK = '#111111'
const FALLBACK_PRIMARY = '#007C7E'
const FALLBACK_WHITE = '#FFFFFF'

function normalizeHex(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return null
  return trimmed.toUpperCase()
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function adjustHex(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex)

  if (ratio >= 1) {
    return `#${clamp(r + (255 - r) * (ratio - 1)).toString(16).padStart(2, '0')}${clamp(g + (255 - g) * (ratio - 1)).toString(16).padStart(2, '0')}${clamp(b + (255 - b) * (ratio - 1)).toString(16).padStart(2, '0')}`.toUpperCase()
  }

  return `#${clamp(r * ratio).toString(16).padStart(2, '0')}${clamp(g * ratio).toString(16).padStart(2, '0')}${clamp(b * ratio).toString(16).padStart(2, '0')}`.toUpperCase()
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)

  const toLinear = (value: number): number => {
    const channel = value / 255
    if (channel <= 0.03928) return channel / 12.92
    return ((channel + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrastRatio(aHex: string, bHex: string): number {
  const a = luminance(aHex)
  const b = luminance(bHex)
  const top = Math.max(a, b)
  const bottom = Math.min(a, b)
  return (top + 0.05) / (bottom + 0.05)
}

function bestForeground(bgHex: string): string {
  const whiteContrast = contrastRatio(bgHex, '#FFFFFF')
  const inkContrast = contrastRatio(bgHex, FALLBACK_INK)
  return whiteContrast >= inkContrast ? '#FFFFFF' : FALLBACK_INK
}

function ensureAaPair(
  backgroundHex: string,
  preferredTextHex: string,
): { background: string; text: string } {
  if (contrastRatio(backgroundHex, preferredTextHex) >= 4.5) {
    return { background: backgroundHex, text: preferredTextHex }
  }

  const text = bestForeground(backgroundHex)
  if (contrastRatio(backgroundHex, text) >= 4.5) {
    return { background: backgroundHex, text }
  }

  // Bounded adjustment: preserve brand intent before falling back.
  for (let step = 1; step <= 10; step++) {
    const amount = step * 0.05
    const lighter = adjustHex(backgroundHex, 1 + amount)
    if (contrastRatio(lighter, text) >= 4.5) {
      return { background: lighter, text }
    }

    const darker = adjustHex(backgroundHex, 1 - amount)
    if (contrastRatio(darker, text) >= 4.5) {
      return { background: darker, text }
    }
  }

  return {
    background: text === '#FFFFFF' ? '#000000' : '#FFFFFF',
    text,
  }
}

function darkenHex(hex: string, factor = 0.14): string {
  return adjustHex(hex, 1 - factor)
}

function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

type BrandSlot = { key: string; hex: string }

function brandSlots(brand: BrandLike | null | undefined): BrandSlot[] {
  const slots = Array.isArray(brand?.settings?.colors?.slots) ? brand?.settings?.colors?.slots : []
  const output: BrandSlot[] = []

  for (const slot of slots) {
    const key = typeof slot?.key === 'string' ? slot.key.trim() : ''
    const hex = normalizeHex(slot?.hex)
    if (!key || !hex) continue

    output.push({ key, hex })
  }

  return output
}

function findSlotByHints(slots: BrandSlot[], hints: string[]): BrandSlot | null {
  const normalizedHints = hints.map((hint) => hint.toLowerCase())

  for (const hint of normalizedHints) {
    const exact = slots.find((slot) => slot.key.toLowerCase() === hint)
    if (exact) return exact
  }

  for (const hint of normalizedHints) {
    const contains = slots.find((slot) => slot.key.toLowerCase().includes(hint))
    if (contains) return contains
  }

  return null
}

function tokenPrimary(brand: BrandLike | null | undefined): string | null {
  const color = brand?.tokens && typeof brand.tokens === 'object' && !Array.isArray(brand.tokens)
    ? (brand.tokens as { color?: Record<string, string> }).color
    : null

  return normalizeHex(color?.['primary-500'])
}

function resolveColorValue(
  value: ThemeColorRef | null | undefined,
  slots: BrandSlot[],
): string | null {
  if (!value || typeof value !== 'object') return null

  if (value.source === 'custom') {
    return normalizeHex(value.hex)
  }

  if (value.source === 'brand') {
    const key = typeof value.slot_key === 'string' ? value.slot_key.trim().toLowerCase() : ''
    if (!key) return null

    const slot = slots.find((entry) => entry.key.toLowerCase() === key)
    return slot?.hex ?? null
  }

  return null
}

function resolveThemeColor(
  sceneColors: StoryTheme['colors'] | null | undefined,
  storyColors: StoryTheme['colors'] | null | undefined,
  key: StoryThemeColorKey,
): ThemeColorRef | null {
  const sceneValue = sceneColors && typeof sceneColors === 'object' ? (sceneColors as any)[key] : null
  if (sceneValue) return sceneValue as ThemeColorRef

  const storyValue = storyColors && typeof storyColors === 'object' ? (storyColors as any)[key] : null
  if (storyValue) return storyValue as ThemeColorRef

  // Legacy support for local data.
  if (key === 'visual_background' || key === 'narrative_background') {
    const legacy = sceneColors && typeof sceneColors === 'object' ? (sceneColors as any).background : null
    if (legacy) return legacy as ThemeColorRef
    return (storyColors && typeof storyColors === 'object' ? (storyColors as any).background : null) as ThemeColorRef | null
  }

  if (key === 'visual_text' || key === 'narrative_text') {
    const legacy = sceneColors && typeof sceneColors === 'object' ? (sceneColors as any).text : null
    if (legacy) return legacy as ThemeColorRef
    return (storyColors && typeof storyColors === 'object' ? (storyColors as any).text : null) as ThemeColorRef | null
  }

  if (key === 'cta_background') {
    const legacy = sceneColors && typeof sceneColors === 'object' ? (sceneColors as any).button : null
    if (legacy) return legacy as ThemeColorRef
    return (storyColors && typeof storyColors === 'object' ? (storyColors as any).button : null) as ThemeColorRef | null
  }

  return null
}

function findFontById(fonts: BrandFontLike[], id: string | null | undefined): BrandFontLike | null {
  if (!id || typeof id !== 'string') return null
  const needle = id.trim()
  if (!needle) return null

  return fonts.find((font) => {
    const uuid = typeof font.uuid === 'string' ? font.uuid : null
    const shortId = typeof font.id === 'string' ? font.id : null
    return uuid === needle || shortId === needle
  }) ?? null
}

function googleFontUrl(family: string, weights: number[] = [400, 700]): string {
  const uniqueWeights = [...new Set(weights)].sort((a, b) => a - b)
  const familyParam = family.trim().replace(/\s+/g, '+')
  const weightParam = uniqueWeights.join(';')

  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightParam}&display=swap`
}

function resolveFontFamily(fonts: BrandFontLike[], id: string | null | undefined): { family: string | null; stylesheet: string | null } {
  if (!id || typeof id !== 'string') {
    return { family: null, stylesheet: null }
  }

  const trimmed = id.trim()
  if (!trimmed) {
    return { family: null, stylesheet: null }
  }

  if (trimmed.startsWith('gfont:')) {
    const family = trimmed.slice(6).trim()
    if (!family) return { family: null, stylesheet: null }
    return {
      family,
      stylesheet: googleFontUrl(family),
    }
  }

  const font = findFontById(fonts, trimmed)
  if (!font || typeof font.family !== 'string' || !font.family.trim()) {
    return { family: null, stylesheet: null }
  }

  const externalUrl = typeof font.external_url === 'string' && font.external_url.trim()
    ? font.external_url.trim()
    : null

  const inferredUrl = font.provider === 'google'
    ? googleFontUrl(font.family.trim(), Array.isArray(font.weights) && font.weights.length ? font.weights : [400, 700])
    : null

  return {
    family: font.family.trim(),
    stylesheet: externalUrl ?? inferredUrl,
  }
}

function isLight(hex: string): boolean {
  return luminance(hex) > 0.75
}

function semanticDefaults(brand: BrandLike | null | undefined, slots: BrandSlot[]) {
  const primary = tokenPrimary(brand)
    ?? findSlotByHints(slots, ['brand', 'primary', 'accent'])?.hex
    ?? FALLBACK_PRIMARY

  const textCandidate = findSlotByHints(slots, ['ink', 'text', 'support-1', 'neutral-900', 'black'])?.hex
    ?? FALLBACK_INK

  const lightSurfaceCandidates = slots
    .filter((slot) => {
      const key = slot.key.toLowerCase()
      return (
        key.includes('surface')
        || key.includes('paper')
        || key.includes('background')
        || key.includes('canvas')
        || key.includes('neutral')
        || key.includes('white')
      )
    })
    .map((slot) => slot.hex)
    .filter((hex, idx, all) => all.indexOf(hex) === idx)
    .sort((a, b) => luminance(b) - luminance(a))

  const preferredSurface = [
    ...lightSurfaceCandidates,
    FALLBACK_SURFACE,
  ].find((hex) => {
    if (!isLight(hex)) return false
    return contrastRatio(hex, textCandidate) >= 4.5
  }) ?? FALLBACK_SURFACE

  const textPair = ensureAaPair(preferredSurface, textCandidate)

  const ctaCandidates = [
    primary,
    findSlotByHints(slots, ['secondary'])?.hex,
    findSlotByHints(slots, ['accent'])?.hex,
    FALLBACK_PRIMARY,
  ].filter((hex): hex is string => typeof hex === 'string' && !!hex)

  let ctaPair = ensureAaPair(ctaCandidates[0], FALLBACK_WHITE)
  if (contrastRatio(ctaPair.background, ctaPair.text) < 4.5) {
    for (const candidate of ctaCandidates) {
      const nextPair = ensureAaPair(candidate, FALLBACK_WHITE)
      if (contrastRatio(nextPair.background, nextPair.text) >= 4.5) {
        ctaPair = nextPair
        break
      }
    }
  }

  return {
    visualBackground: textPair.background,
    visualText: textPair.text,
    narrativeBackground: textPair.background,
    narrativeText: textPair.text,
    ctaBackground: ctaPair.background,
    ctaText: ctaPair.text,
    brandPrimary: primary,
  }
}

export function resolveStoryTheme(input: ResolveStoryThemeInput): ResolveStoryThemeResult {
  const effectiveBrand = input.effectiveBrand ?? null
  const storyTheme = input.storyTheme ?? null
  const sceneTheme = input.sceneThemeOverrides ?? null
  const slots = brandSlots(effectiveBrand)
  const defaults = semanticDefaults(effectiveBrand, slots)

  const visualBg = resolveColorValue(
    resolveThemeColor(sceneTheme?.colors, storyTheme?.colors, 'visual_background'),
    slots,
  ) ?? defaults.visualBackground

  const visualTextRaw = resolveColorValue(
    resolveThemeColor(sceneTheme?.colors, storyTheme?.colors, 'visual_text'),
    slots,
  ) ?? defaults.visualText
  const visualPair = ensureAaPair(visualBg, visualTextRaw)

  const narrativeBg = resolveColorValue(
    resolveThemeColor(sceneTheme?.colors, storyTheme?.colors, 'narrative_background'),
    slots,
  ) ?? defaults.narrativeBackground

  const narrativeTextRaw = resolveColorValue(
    resolveThemeColor(sceneTheme?.colors, storyTheme?.colors, 'narrative_text'),
    slots,
  ) ?? defaults.narrativeText
  const narrativePair = ensureAaPair(narrativeBg, narrativeTextRaw)

  const ctaBg = resolveColorValue(
    resolveThemeColor(sceneTheme?.colors, storyTheme?.colors, 'cta_background'),
    slots,
  ) ?? defaults.ctaBackground

  const ctaTextRaw = resolveColorValue(
    resolveThemeColor(sceneTheme?.colors, storyTheme?.colors, 'cta_text'),
    slots,
  ) ?? defaults.ctaText
  const ctaPair = ensureAaPair(ctaBg, ctaTextRaw)

  const fonts = Array.isArray(input.brandFonts) ? input.brandFonts : []
  const headingFont = resolveFontFamily(
    fonts,
    sceneTheme?.typography?.heading_font_id ?? storyTheme?.typography?.heading_font_id ?? null,
  )
  const bodyFont = resolveFontFamily(
    fonts,
    sceneTheme?.typography?.body_font_id ?? storyTheme?.typography?.body_font_id ?? null,
  )

  const stylesheets = [
    typeof effectiveBrand?.css_path === 'string' ? effectiveBrand.css_path : null,
    headingFont.stylesheet,
    bodyFont.stylesheet,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  const brandPrimary = defaults.brandPrimary || ctaPair.background

  const cssVars: Record<string, string> = {
    '--story-visual-bg': visualPair.background,
    '--story-visual-text': visualPair.text,
    '--story-narrative-bg': narrativePair.background,
    '--story-narrative-text': narrativePair.text,
    '--story-cta-bg': ctaPair.background,
    '--story-cta-text': ctaPair.text,
    '--story-divider': toRgba(narrativePair.text, 0.18),
    '--brand-primary': brandPrimary,
    '--color-primary-500': brandPrimary,
    '--color-primary-600': darkenHex(brandPrimary),
    // Legacy aliases.
    '--story-bg': narrativePair.background,
    '--story-text': narrativePair.text,
    '--story-button': ctaPair.background,
    '--story-button-text': ctaPair.text,
  }

  if (headingFont.family) {
    cssVars['--story-font-heading'] = headingFont.family
  }
  if (bodyFont.family) {
    cssVars['--story-font-body'] = bodyFont.family
  }

  return {
    cssVars,
    stylesheets: [...new Set(stylesheets)],
  }
}
