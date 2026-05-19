import type { StoryNarrativeChrome } from '../../types/storytime/scenes'
import { isOverlayNarrativeChrome } from './resolveNarrativeChrome'

export type StoryNarrativeChromeDiagnosticSeverity = 'warning' | 'error'

export type StoryNarrativeChromeDiagnostic = {
  code: string
  severity: StoryNarrativeChromeDiagnosticSeverity
  message: string
}

type Rgb = { r: number; g: number; b: number }

const MIN_BODY_TEXT_CONTRAST = 4.5

export function validateNarrativeChrome(chrome: StoryNarrativeChrome): StoryNarrativeChromeDiagnostic[] {
  const diagnostics: StoryNarrativeChromeDiagnostic[] = []

  if (!isOverlayNarrativeChrome(chrome)) {
    return diagnostics
  }

  const background = parseColor(chrome.surface?.background)
  const text = parseColor(chrome.typography?.color || chrome.surface?.text)

  if (background && text) {
    const ratio = contrastRatio(background, text)

    if (ratio < MIN_BODY_TEXT_CONTRAST) {
      diagnostics.push({
        code: 'narrative_chrome.low_text_contrast',
        severity: 'error',
        message: `Narrative text contrast is ${ratio.toFixed(2)}:1, below the ${MIN_BODY_TEXT_CONTRAST}:1 body-text threshold.`,
      })
    }
  } else if (chrome.presentation === 'overlay-card') {
    diagnostics.push({
      code: 'narrative_chrome.unverified_text_contrast',
      severity: 'warning',
      message: 'Narrative overlay card contrast could not be verified because surface or text color is not a concrete color.',
    })
  }

  if (chrome.presentation === 'transparent') {
    diagnostics.push({
      code: 'narrative_chrome.transparent_backdrop_unverified',
      severity: 'warning',
      message: 'Transparent narrative text needs visual-backdrop validation before the preview is treated as ready.',
    })
  }

  if (typeof chrome.surface?.opacity === 'number' && chrome.surface.opacity < 0.82) {
    diagnostics.push({
      code: 'narrative_chrome.low_surface_opacity',
      severity: 'warning',
      message: 'Narrative card opacity is low enough that visual backdrop contrast should be checked.',
    })
  }

  if (chrome.position === 'center' && (chrome.width === 'lg' || chrome.width === 'xl')) {
    diagnostics.push({
      code: 'narrative_chrome.high_overlap_risk',
      severity: 'warning',
      message: 'A large centered overlay card has a high risk of obscuring critical visual content.',
    })
  }

  if (chrome.position === 'custom') {
    diagnostics.push({
      code: 'narrative_chrome.custom_position_unverified',
      severity: 'warning',
      message: 'Custom narrative card placement needs viewport overlap validation.',
    })
  }

  return diagnostics
}

function parseColor(value?: string): Rgb | null {
  if (!value) return null

  const trimmed = value.trim()
  const hex = parseHexColor(trimmed)
  if (hex) return hex

  return parseRgbColor(trimmed)
}

function parseHexColor(value: string): Rgb | null {
  const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return null

  const raw = match[1]
  const normalized = raw.length === 3
    ? raw.split('').map((char) => `${char}${char}`).join('')
    : raw

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function parseRgbColor(value: string): Rgb | null {
  const match = value.match(/^rgb\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*\)$/i)
    || value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)

  if (!match) return null

  const [, r, g, b] = match.map(Number)
  if (![r, g, b].every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255)) {
    return null
  }

  return { r, g, b }
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const l1 = relativeLuminance(first)
  const l2 = relativeLuminance(second)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance(color: Rgb): number {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255

    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
