export type StoryLayout = 'split' | 'full'

export type StoryNarrativePresentation = 'split-column' | 'overlay-card' | 'transparent' | 'hidden'

export type StoryNarrativePosition = 'right' | 'left' | 'center' | 'lower-right' | 'lower-left' | 'custom'

export type StoryNarrativeWidth = 'sm' | 'md' | 'lg' | 'xl' | string

export type StoryNarrativeShape = 'rectangle' | 'clipped-corner' | 'angled-edge'

export type StoryNarrativeMobileBehavior = 'stacked-card' | 'overlay-card' | 'hidden'

export type StoryNarrativeSurface = {
  background?: string
  text?: string
  border?: string
  opacity?: number
  blur?: string
  shadow?: 'none' | 'soft' | 'strong' | string
}

export type StoryNarrativeTypography = {
  headingScale?: 'sm' | 'md' | 'lg' | 'xl'
  bodyScale?: 'sm' | 'md' | 'lg'
  paragraphSpacing?: 'tight' | 'normal' | 'loose'
  color?: string
}

export type StoryNarrativeScrollBehavior = {
  desktop?: 'normal-column' | 'overlay-on-visual'
  mobile?: StoryNarrativeMobileBehavior
}

export type StoryNarrativeChrome = {
  presentation?: StoryNarrativePresentation
  position?: StoryNarrativePosition
  width?: StoryNarrativeWidth
  surface?: StoryNarrativeSurface
  shape?: StoryNarrativeShape
  typography?: StoryNarrativeTypography
  scrollBehavior?: StoryNarrativeScrollBehavior
}

export type StoryArticleBlock =
  | { type: 'copy'; props: Record<string, any> }
  | { type: 'cta'; props: Record<string, any> }
  | { type: 'mediaCaption'; props: Record<string, any> }
  | { type: 'html'; props: { html: string } }

export type StoryVisual = {
  podSlug: string
  props?: Record<string, any>
}

export type StoryArticleStep = {
  align?: 'left' | 'center' | 'right'
  blocks?: StoryArticleBlock[]
  /**
   * Mobile-only layout tuning per article step
   */
  mobileTopOffsetDvh?: number
  mobileBottomOffsetDvh?: number
  mobileMinHeightDvh?: number
  /** Preferred viewport Y fraction for triggering this step (0..1), defaults to 0.5 (desktop only) */
  triggerCenterFraction?: number
}

export type StoryScene = {
  key: string
  layout?: StoryLayout
  narrative?: StoryNarrativeChrome
  visual: StoryVisual
  /**
   * Scene defaults for mobile layout if per-step values are not provided.
   */
  mobileLeadInDvh?: number
  mobileLeadOutDvh?: number
  mobileCardGapDvh?: number
  mobileMinHeightDvh?: number
  articles: StoryArticleStep[]
}

export type FlatStoryStep = { sceneIdx: number; localStep: number; article: StoryArticleStep }
