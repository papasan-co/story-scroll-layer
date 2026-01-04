export type StoryLayout = 'split' | 'full'

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

