import type {
  GeneratedStoryPresentation,
  StorySceneMotionPresentation,
} from './presentation.generated'

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K]
}

export {
  STORY_PRESENTATION_CONTRACT_VERSION,
} from './presentation.generated'
export {
  MOTION_CAPABILITIES,
  MOTION_CAPABILITY_REGISTRY_HASH,
  MOTION_CAPABILITY_REGISTRY_VERSION,
} from './motionCapabilities.generated'
export type {
  GeneratedStoryPresentation,
  StoryActivationMode,
  StoryChapterNavBrandMode,
  StoryChapterNavBrandPresentation,
  StoryChapterNavChromeMode,
  StoryChapterNavCtaPresentation,
  StoryChapterNavPresentation,
  StoryControlsMode,
  StoryControlsPresentation,
  StoryControlsReactionPresentation,
  StoryFlowMode,
  StoryIntroExitTarget,
  StoryJumpAlign,
  StoryResponsiveJumpAlignRule,
  StoryResponsiveNumberRule,
  StoryMotionBinding,
  StoryMotionEasing,
  StoryMotionTargetKey,
  StorySceneMotionPresentation,
  StoryScenePresentation,
  StoryScrollHintMode,
  StoryScrollHintPresentation,
  StoryScrollPresentation,
  StoryScrollTarget,
  StoryVisualTransitionMode,
} from './presentation.generated'

export type StoryLayout = 'split' | 'full'
export type StoryCardMode = 'side-by-side' | 'overlay' | 'viewport-stack' | 'hidden'
export type StoryCardAlign = 'left' | 'center' | 'right'
export type StorySceneFlow = 'scrolly' | 'standalone'

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
  narrative?: StoryNarrativeChrome
  cardMode?: StoryCardMode
  responsiveCardMode?: StoryCardMode
  responsiveBreakpoint?: number
  cardAlign?: StoryCardAlign
  motion?: StorySceneMotionPresentation
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

/**
 * Pre-contract timed-path types. Keep these hand-maintained until the MNE
 * presentation mode stabilizes and receives its own schema fragment.
 */
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

export type StoryPresentation = Omit<RemoveIndexSignature<GeneratedStoryPresentation>, 'chapters'> & {
  chapters?: StoryChapter[]
  timedPath?: StoryTimedPathPresentation
  [key: string]: unknown
}
