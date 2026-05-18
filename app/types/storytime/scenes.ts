export type StoryLayout = 'split' | 'full'
export type StoryCardMode = 'side-by-side' | 'overlay' | 'viewport-stack' | 'hidden'
export type StoryCardAlign = 'left' | 'center' | 'right'
export type StoryScrollTarget = 'step' | 'card'
export type StoryActivationMode = 'step-exit' | 'card-center'
export type StoryVisualTransitionMode = 'fade' | 'cross-reveal'

export type StoryArticleBlock =
  | { type: 'copy'; props: Record<string, any> }
  | { type: 'cta'; props: Record<string, any> }
  | { type: 'mediaCaption'; props: Record<string, any> }
  | { type: 'html'; props: { html: string } }

export type StoryVisual = {
  podSlug: string
  props?: Record<string, any>
  disableParallax?: boolean
}

export type StoryArticleStep = {
  align?: 'left' | 'center' | 'right'
  blocks?: StoryArticleBlock[]
  desktopOnly?: boolean
  mobileOnly?: boolean
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
  id?: string
  key: string
  sourceKey?: string
  layout?: StoryLayout
  cardMode?: StoryCardMode
  cardAlign?: StoryCardAlign
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

export type StoryChapter = {
  id: string
  label: string
  sceneKeys: string[]
  children?: StoryChapter[]
}

export type StoryControlsPresentation = {
  variant?: 'default' | 'minimal' | 'we2'
  keyboard?: boolean
  showShare?: boolean
  showProgress?: boolean
  showVideoControls?: boolean
  hideOnMobileBelow?: number
  bottomOffsetPx?: number
  responsiveBottomOffsetPx?: Array<{
    minWidth?: number
    maxWidth?: number
    value: number
  }>
  jumpAlign?: 'center' | 'start'
  jumpTarget?: StoryScrollTarget
}

export type StoryChapterNavBrandPresentation = {
  variant?: 'text' | 'we2-mark'
  label?: string
  sceneKeys?: string[]
}

export type StoryChapterNavPresentation = {
  variant?: 'default' | 'we2'
  showToggle?: boolean
  brand?: StoryChapterNavBrandPresentation
  darkSceneKeys?: string[]
  jumpAlign?: 'center' | 'start'
  jumpTarget?: StoryScrollTarget
}

export type StoryScrollHintPresentation = {
  enabled?: boolean
  variant?: 'default' | 'we2'
  label?: string
  sceneKeys?: string[]
  fontFamily?: string
}

export type StoryScrollPresentation = {
  jumpTarget?: StoryScrollTarget
  activationMode?: StoryActivationMode
  activationAnchor?: number
  activationHysteresisPx?: number
  stepMinHeight?: string
  viewportStackStepMinHeight?: string
}

export type StoryPresentation = {
  navMode?: string
  chapters?: StoryChapter[]
  controls?: StoryControlsPresentation
  chapterNav?: StoryChapterNavPresentation
  scrollHint?: StoryScrollHintPresentation
  scroll?: StoryScrollPresentation
  visualTransitionMode?: StoryVisualTransitionMode
  [key: string]: any
}
