export type StoryLayout = 'split' | 'full'
export type StoryCardMode = 'side-by-side' | 'overlay' | 'viewport-stack' | 'hidden'
export type StoryCardAlign = 'left' | 'center' | 'right'
export type StorySceneFlow = 'scrolly' | 'standalone'
export type StoryFlowMode = 'scrolly' | 'timed-path'
export type StoryScrollTarget = 'step' | 'card'
export type StoryJumpAlign = 'center' | 'start' | 'end'
export type StoryActivationMode = 'step-exit' | 'card-center' | 'card-exit-next'
export type StoryIntroExitTarget = 'default' | 'step-target' | 'scrolly-start'
export type StoryVisualTransitionMode = 'fade' | 'cross-reveal'
export type StoryChapterNavChromeMode = 'default' | 'floating-rail'
export type StoryChapterNavBrandMode = 'text' | 'image' | 'mark' | 'none'
export type StoryControlsMode = 'default' | 'minimal' | 'pill' | 'arrows'
export type StoryScrollHintMode = 'default' | 'corner'

export type StoryResponsiveNumberRule = {
  minWidth?: number
  maxWidth?: number
  value: number
}

export type StoryResponsiveJumpAlignRule = {
  minWidth?: number
  maxWidth?: number
  value: StoryJumpAlign
}

export type StoryArticleBlock =
  | { type: 'copy'; props: Record<string, any> }
  | { type: 'cta'; props: Record<string, any> }
  | { type: 'mediaCaption'; props: Record<string, any> }
  | { type: 'html'; props: { html: string } }

export type StoryVisual = {
  podSlug: string
  version?: string
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
  flow?: StorySceneFlow
  layout?: StoryLayout
  cardMode?: StoryCardMode
  responsiveCardMode?: StoryCardMode
  responsiveBreakpoint?: number
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

export type StoryTimedPathMediaKind = 'color' | 'gradient' | 'image' | 'video'
export type StoryTimedPathLayout = 'full' | 'split'
export type StoryTimedPathDirection = 'forward' | 'back'

export type StoryTimedPathMedia = {
  kind: StoryTimedPathMediaKind
  src?: string | Record<string, any>
  url?: string | Record<string, any>
  directUrl?: string
  s3Key?: string
  key?: string
  background?: string
  backgroundColor?: string
  overlay?: string | false | null
  mediaId?: string
  mediaUuid?: string
  color?: string
  value?: string
  alt?: string
  fit?: 'cover' | 'contain'
  position?: string
  muted?: boolean
  loop?: boolean
  autoplay?: boolean
  playsInline?: boolean
  [key: string]: any
}

export type StoryTimedPathChoice = {
  key: string
  label: string
  pathKey?: string
  description?: string
  icon?: string
  trackLabel?: string
  trackModifier?: string
  [key: string]: any
}

export type StoryTimedPathStep = {
  id?: string
  key: string
  sourceKey?: string
  sceneKey: string
  sceneLabel?: string
  type: string
  durationMs?: number
  layout?: StoryTimedPathLayout
  media?: StoryTimedPathMedia | null
  visual?: StoryVisual
  blocks?: StoryArticleBlock[]
  choices?: StoryTimedPathChoice[]
  pre?: string
  title?: string
  body?: string
  [key: string]: any
}

export type StoryTimedPathChapter = {
  key: string
  label: string
  sceneKeys?: string[]
  stepKeys?: string[]
  children?: StoryTimedPathChapter[]
}

export type StoryTimedPathExploreMoreTarget = {
  key: string
  label: string
  positions: number[]
}

export type StoryTimedPathControls = {
  controlMode?: 'bottom-bar' | 'top-icons' | 'hidden'
  chapterMenuMode?: 'floating-list' | 'modal-list'
  chapterMenuTitle?: string
  keyboard?: boolean
  tapZones?: boolean
  swipe?: boolean
  pauseOnHold?: boolean
  clearPathOnBackToChoice?: boolean
  showProgress?: boolean
  showLocation?: boolean
  showChapterMenu?: boolean
  showStepDots?: boolean
}

export type StoryTimedPathPresentation = {
  steps?: StoryTimedPathStep[]
  paths?: Record<string, string[]>
  chapters?: StoryTimedPathChapter[]
  initialPath?: string | null
  defaultAdvance?: 'right' | 'left'
  controls?: StoryTimedPathControls
  choiceStepType?: string
  splitBreakpoint?: number
}

export type StoryControlsPresentation = {
  /**
   * @deprecated Use controlMode. Existing WE-2 payloads may still send variant=we2.
   */
  variant?: 'default' | 'minimal' | 'we2'
  controlMode?: StoryControlsMode
  keyboard?: boolean
  showShare?: boolean
  showProgress?: boolean
  showVideoControls?: boolean
  hideOnMobileBelow?: number
  autoHideOnMobile?: boolean
  bottomOffsetPx?: number
  responsiveBottomOffsetPx?: StoryResponsiveNumberRule[]
  jumpAlign?: StoryJumpAlign
  responsiveJumpAlign?: StoryResponsiveJumpAlignRule[]
  jumpEndOffsetPx?: number
  responsiveJumpEndOffsetPx?: StoryResponsiveNumberRule[]
  jumpTarget?: StoryScrollTarget
  mobileCta?: StoryChapterNavCtaPresentation | null
}

export type StoryChapterNavBrandPresentation = {
  /**
   * @deprecated Use mode. Existing WE-2 payloads may still send variant=we2-mark.
   */
  variant?: 'text' | 'image' | 'mark' | 'we2-mark'
  mode?: StoryChapterNavBrandMode
  label?: string
  logoUrl?: string
  mobileLogoUrl?: string
  sceneKeys?: string[]
}

export type StoryChapterNavCtaPresentation = {
  url?: string
  label?: string
  suffix?: string
  ariaLabel?: string
  target?: '_blank' | '_self'
  rel?: string
  downloadFilename?: string
  trackLabel?: string
  trackModifier?: string
}

export type StoryChapterNavPresentation = {
  /**
   * @deprecated Use chromeMode. Existing WE-2 payloads may still send variant=we2.
   */
  variant?: 'default' | 'we2'
  chromeMode?: StoryChapterNavChromeMode
  brandMode?: StoryChapterNavBrandMode
  showToggle?: boolean
  inactiveLabel?: string
  inactiveBehavior?: 'none' | 'first-chapter'
  brand?: StoryChapterNavBrandPresentation
  cta?: StoryChapterNavCtaPresentation | null
  darkSceneKeys?: string[]
  jumpAlign?: StoryJumpAlign
  responsiveJumpAlign?: StoryResponsiveJumpAlignRule[]
  jumpEndOffsetPx?: number
  responsiveJumpEndOffsetPx?: StoryResponsiveNumberRule[]
  jumpTarget?: StoryScrollTarget
}

export type StoryScrollHintPresentation = {
  enabled?: boolean
  /**
   * @deprecated Use mode. Existing WE-2 payloads may still send variant=we2.
   */
  variant?: 'default' | 'we2'
  mode?: StoryScrollHintMode
  label?: string
  sceneKeys?: string[]
  fontFamily?: string
  bottomOffsetPx?: number
  responsiveBottomOffsetPx?: StoryResponsiveNumberRule[]
}

export type StoryScrollPresentation = {
  jumpTarget?: StoryScrollTarget
  activationMode?: StoryActivationMode
  activationAnchor?: number
  activationHysteresisPx?: number
  introExitTarget?: StoryIntroExitTarget
  introExitDurationMs?: number
  introReturnDurationMs?: number
  disableSnap?: boolean
  stepMinHeight?: string
  viewportStackStepMinHeight?: string
}

export type StoryPresentation = {
  flowMode?: StoryFlowMode
  navMode?: string
  chapters?: StoryChapter[]
  controls?: StoryControlsPresentation
  chapterNav?: StoryChapterNavPresentation
  scrollHint?: StoryScrollHintPresentation
  scroll?: StoryScrollPresentation
  timedPath?: StoryTimedPathPresentation
  visualTransitionMode?: StoryVisualTransitionMode
  [key: string]: any
}
