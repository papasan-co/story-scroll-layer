import type { StoryNarrativeChrome, StoryScene } from '../../types/storytime/scenes'

export function resolveNarrativeChromeForScene(scene?: StoryScene): StoryNarrativeChrome {
  const configured = scene?.narrative || {}
  const presentation = configured.presentation || (scene?.layout === 'full' ? 'hidden' : 'split-column')

  return {
    ...configured,
    presentation,
    position: configured.position || 'right',
    width: configured.width || 'md',
    shape: configured.shape || 'rectangle',
    scrollBehavior: {
      desktop: presentation === 'overlay-card' || presentation === 'transparent'
        ? 'overlay-on-visual'
        : 'normal-column',
      mobile: presentation === 'hidden' ? 'hidden' : 'stacked-card',
      ...(configured.scrollBehavior || {}),
    },
  }
}

export function isOverlayNarrativeChrome(chrome: StoryNarrativeChrome): boolean {
  return chrome.presentation === 'overlay-card' || chrome.presentation === 'transparent'
}

export function isExplicitlyHiddenNarrativeScene(scene?: StoryScene): boolean {
  return scene?.narrative?.presentation === 'hidden'
}

export function isLegacyFullNarrativeScene(scene?: StoryScene): boolean {
  return !scene?.narrative && scene?.layout === 'full'
}

export function storyNarrativeShadowValue(shadow?: string): string {
  if (!shadow || shadow === 'soft') {
    return '0 18px 42px rgb(17 17 17 / 18%)'
  }

  if (shadow === 'none') {
    return 'none'
  }

  if (shadow === 'strong') {
    return '0 24px 64px rgb(17 17 17 / 28%)'
  }

  return shadow
}

export function storyNarrativeCardWidthValue(width?: string): string {
  if (!width || width === 'md') return '34rem'
  if (width === 'sm') return '26rem'
  if (width === 'lg') return '42rem'
  if (width === 'xl') return '52rem'

  return width
}

export function storyNarrativeOpacityPercent(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '100%'
  }

  const clamped = Math.min(1, Math.max(0, value))

  return `${Math.round(clamped * 100)}%`
}

export function storyNarrativeCardCssVars(chrome: StoryNarrativeChrome): Record<string, string> {
  const surface = chrome.surface || {}
  const typography = chrome.typography || {}

  return {
    borderLeftColor: 'var(--story-divider)',
    '--story-narrative-card-bg': surface.background || 'var(--story-narrative-bg)',
    '--story-narrative-card-text': typography.color || surface.text || '#111111',
    '--story-narrative-card-border': surface.border || 'var(--story-divider)',
    '--story-narrative-card-blur': surface.blur || '0px',
    '--story-narrative-card-shadow': storyNarrativeShadowValue(surface.shadow),
    '--story-narrative-card-width': storyNarrativeCardWidthValue(chrome.width),
    '--story-narrative-card-opacity-percent': storyNarrativeOpacityPercent(surface.opacity),
  }
}
