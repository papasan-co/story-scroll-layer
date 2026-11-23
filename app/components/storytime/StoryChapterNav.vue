<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { shareStory, type StoryShareOutcome } from '../../composables/storytime/useStoryShare'
import type {
  StoryChapter,
  StoryChapterNavBrandMode,
  StoryChapterNavBrandPresentation,
  StoryChapterNavChromeMode,
  StoryChapterNavCtaPresentation,
} from '../../types/storytime/scenes'

type ChapterLike = StoryChapter & {
  shortLabel?: string
  sceneKey?: string
  children?: ChapterLike[]
}

const props = withDefaults(defineProps<{
  chapters: ChapterLike[]
  activeSceneKey: string
  brandLabel?: string
  ariaLabel?: string
  chromeMode?: StoryChapterNavChromeMode
  brandMode?: StoryChapterNavBrandMode
  /**
   * @deprecated Use chromeMode. Existing WE-2 payloads may still send variant=we2.
   */
  variant?: 'default' | 'we2'
  showToggle?: boolean
  inactiveLabel?: string
  inactiveBehavior?: 'none' | 'first-chapter'
  brand?: StoryChapterNavBrandPresentation | null
  cta?: StoryChapterNavCtaPresentation | null
  openCtaDialog?: (event: MouseEvent) => void
  darkSceneKeys?: string[]
  backgroundColor?: string
  textColor?: string
  activeBackgroundColor?: string
  activeTextColor?: string
  fontFamily?: string
  borderColor?: string
  ctaBackgroundColor?: string
  ctaTextColor?: string
  ctaDetached?: boolean
  disableTeleport?: boolean
}>(), {
  brandLabel: '',
  ariaLabel: 'Story chapters',
  chromeMode: 'default',
  brandMode: undefined,
  variant: 'default',
  showToggle: true,
  inactiveLabel: '',
  inactiveBehavior: 'none',
  brand: null,
  cta: null,
  darkSceneKeys: () => [],
  backgroundColor: '',
  textColor: '',
  activeBackgroundColor: '',
  activeTextColor: '',
  fontFamily: '',
  borderColor: '',
  ctaBackgroundColor: '',
  ctaTextColor: '',
  ctaDetached: false,
  disableTeleport: false,
})

const emit = defineEmits<{
  jump: [sceneKeys: string[]]
  share: [outcome: StoryShareOutcome]
}>()

const expanded = ref(false)
const openMenuId = ref<string | null>(null)
const rootEl = ref<HTMLElement | null>(null)

const normalizedChapters = computed(() => props.chapters || [])
const navChromeMode = computed<StoryChapterNavChromeMode>(() => {
  if (props.chromeMode === 'floating-rail') return 'floating-rail'
  return props.variant === 'we2' ? 'floating-rail' : 'default'
})
const sceneTheme = computed<'light' | 'dark'>(() => {
  return props.darkSceneKeys.includes(props.activeSceneKey) ? 'dark' : 'light'
})
const brandPresentation = computed<StoryChapterNavBrandPresentation>(() => props.brand || {})
const brandLabelText = computed(() => brandPresentation.value.label || props.brandLabel || '')
const brandLogoUrl = computed(() => {
  const url = brandPresentation.value.logoUrl
  return typeof url === 'string' && url.trim() ? url.trim() : ''
})
const brandMobileLogoUrl = computed(() => {
  const url = brandPresentation.value.mobileLogoUrl
  return typeof url === 'string' && url.trim() ? url.trim() : ''
})
const brandMode = computed<StoryChapterNavBrandMode>(() => {
  const requested = brandPresentation.value.mode || props.brandMode || brandPresentation.value.variant
  if (requested === 'we2-mark') return 'mark'
  if (requested === 'text' || requested === 'image' || requested === 'mark' || requested === 'none') return requested
  if (brandLogoUrl.value || brandMobileLogoUrl.value) return 'image'
  return brandLabelText.value ? 'text' : 'none'
})
const showBrand = computed(() => brandMode.value !== 'none' && Boolean(brandLabelText.value || brandLogoUrl.value || brandMobileLogoUrl.value || brandMode.value === 'mark'))
const showToggleControl = computed(() => props.showToggle !== false)
const ctaPresentation = computed<StoryChapterNavCtaPresentation>(() => props.cta || {})
const ctaUrl = computed(() => typeof ctaPresentation.value.url === 'string' ? ctaPresentation.value.url.trim() : '')
/** 'share' renders a button that opens the native share sheet (copy-link fallback); anything else is a link */
const ctaAction = computed(() => ctaPresentation.value.action === 'share' ? 'share' : 'link')
const ctaRenders = computed(() => ctaAction.value === 'share' || Boolean(ctaUrl.value))
const ctaShareOutcome = ref<StoryShareOutcome | ''>('')
async function onCtaShare() {
  const outcome = await shareStory({ title: typeof document !== 'undefined' ? document.title : undefined })
  ctaShareOutcome.value = outcome
  emit('share', outcome)
  if (outcome === 'copied') window.setTimeout(() => { if (ctaShareOutcome.value === 'copied') ctaShareOutcome.value = '' }, 1300)
}
const ctaDownloadFilename = computed(() => {
  const filename = ctaPresentation.value.downloadFilename
  return typeof filename === 'string' && filename.trim() ? filename.trim() : undefined
})
const ctaLabel = computed(() => {
  const label = ctaPresentation.value.label
  return typeof label === 'string' && label.trim() ? label.trim() : 'Open link'
})
const ctaTarget = computed(() => ctaPresentation.value.target === '_self' ? '_self' : '_blank')
const ctaAriaLabel = computed(() => {
  const label = ctaPresentation.value.ariaLabel
  return typeof label === 'string' && label.trim()
    ? label.trim()
    : `${ctaLabel.value}${!props.openCtaDialog && ctaTarget.value === '_blank' ? ' (opens in new tab)' : ''}`
})
const ctaRel = computed(() => {
  const rel = ctaPresentation.value.rel
  if (typeof rel === 'string' && rel.trim()) return rel.trim()
  return ctaTarget.value === '_blank' ? 'noopener noreferrer' : undefined
})
const ctaTrackLabel = computed(() => {
  const label = ctaPresentation.value.trackLabel
  return typeof label === 'string' && label.trim() ? label.trim() : 'chapter-nav-cta'
})
const ctaTrackModifier = computed(() => {
  const modifier = ctaPresentation.value.trackModifier
  return typeof modifier === 'string' && modifier.trim() ? modifier.trim() : 'cta'
})
const navStyle = computed<Record<string, string>>(() => {
  const styles: Record<string, string> = {}
  if (props.backgroundColor) styles['--story-chapter-nav-bg'] = props.backgroundColor
  if (props.textColor) styles['--story-chapter-nav-text'] = props.textColor
  if (props.activeBackgroundColor) styles['--story-chapter-nav-active-bg'] = props.activeBackgroundColor
  if (props.activeTextColor) styles['--story-chapter-nav-active-text'] = props.activeTextColor
  if (props.fontFamily) styles.fontFamily = props.fontFamily
  if (props.borderColor) styles['--story-chapter-nav-border'] = props.borderColor
  if (props.ctaBackgroundColor) styles['--story-chapter-nav-cta-bg'] = props.ctaBackgroundColor
  if (props.ctaTextColor) styles['--story-chapter-nav-cta-text'] = props.ctaTextColor
  return styles
})

function chapterSceneKeys(chapter: ChapterLike): string[] {
  if (Array.isArray(chapter.sceneKeys) && chapter.sceneKeys.length) {
    return chapter.sceneKeys
  }

  return chapter.sceneKey ? [chapter.sceneKey] : []
}

function chapterLabel(chapter: ChapterLike) {
  return chapter.shortLabel || chapter.label || chapter.id
}

function containsScene(chapter: ChapterLike, sceneKey: string): boolean {
  if (!sceneKey) return false
  if (chapterSceneKeys(chapter).includes(sceneKey)) return true
  return (chapter.children || []).some(child => containsScene(child, sceneKey))
}

const activeIndex = computed(() => {
  const index = normalizedChapters.value.findIndex(chapter => containsScene(chapter, props.activeSceneKey))
  if (index >= 0) return index
  return props.inactiveBehavior === 'first-chapter' && normalizedChapters.value.length ? 0 : -1
})

const activeChapter = computed(() => activeIndex.value >= 0 ? normalizedChapters.value[activeIndex.value] : undefined)
const currentLabel = computed(() => {
  if (activeChapter.value) return chapterLabel(activeChapter.value)
  return typeof props.inactiveLabel === 'string' ? props.inactiveLabel.trim() : ''
})
const currentTrackLabel = computed(() => activeChapter.value?.id || currentLabel.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))

function jumpTo(chapter: ChapterLike) {
  const sceneKeys = chapterSceneKeys(chapter)
  if (!sceneKeys.length) return

  emit('jump', sceneKeys)
  openMenuId.value = null

  if (window.innerWidth < 1024) {
    expanded.value = false
  }
}

function onChapterPointerEnter(event: PointerEvent, chapter: ChapterLike) {
  if (event.pointerType === 'mouse') {
    openMenuId.value = chapter.children?.length ? chapter.id : null
  }
}

function onChapterClick(chapter: ChapterLike) {
  if (chapter.children?.length) {
    openMenuId.value = openMenuId.value === chapter.id ? null : chapter.id
    return
  }

  jumpTo(chapter)
}

function onCurrentClick() {
  if (activeChapter.value) {
    jumpTo(activeChapter.value)
    return
  }

  if (showToggleControl.value) {
    toggleExpanded()
    return
  }

  onBrandClick()
}

function onBrandClick() {
  const sceneKeys = brandPresentation.value.sceneKeys
  if (Array.isArray(sceneKeys) && sceneKeys.length) {
    emit('jump', sceneKeys)
    openMenuId.value = null
    return
  }

  const first = normalizedChapters.value[0]
  if (first) jumpTo(first)
}

function syncExpanded() {
  if (!showToggleControl.value) {
    expanded.value = true
    return
  }

  expanded.value = window.innerWidth >= 1024
}

function toggleExpanded() {
  if (!showToggleControl.value) return
  expanded.value = !expanded.value
  if (!expanded.value) openMenuId.value = null
}

function onDocumentClick(event: MouseEvent) {
  if (!showToggleControl.value) return
  if (!expanded.value) return
  if (window.innerWidth >= 1024) return

  const target = event.target as Node | null
  if (rootEl.value && target && !rootEl.value.contains(target)) {
    expanded.value = false
    openMenuId.value = null
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!showToggleControl.value) return
  if (event.key !== 'Escape') return
  expanded.value = false
  openMenuId.value = null
}

watch(() => props.activeSceneKey, () => {
  openMenuId.value = null
})

onMounted(() => {
  syncExpanded()
  window.addEventListener('resize', syncExpanded, { passive: true })
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncExpanded)
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body" :disabled="disableTeleport">
    <nav
      ref="rootEl"
      class="story-chapter-nav"
      :class="[
        `story-chapter-nav--${navChromeMode}`,
        `story-chapter-nav--${sceneTheme}`,
        { 'is-expanded': expanded, 'story-chapter-nav--cta-detached': props.ctaDetached },
      ]"
      :style="navStyle"
      data-story-chapter-nav
      :data-story-chapter-chrome-mode="navChromeMode"
      :data-story-chapter-theme="sceneTheme"
      :aria-label="ariaLabel"
    >
      <div class="story-chapter-nav__bar">
        <button
          v-if="showBrand"
          type="button"
          class="story-chapter-nav__brand"
          data-story-chapter-brand
          :data-story-chapter-brand-mode="brandMode"
          data-au-track="chapter-nav"
          data-au-label="brand"
          data-au-modifier="cover"
          :aria-label="brandLabelText || 'Back to cover'"
          @click="onBrandClick"
        >
          <img
            v-if="brandLogoUrl"
            class="story-chapter-nav__brand-image story-chapter-nav__brand-image--desktop"
            :src="brandLogoUrl"
            alt=""
            aria-hidden="true"
          >
          <img
            v-if="brandMobileLogoUrl"
            class="story-chapter-nav__brand-image story-chapter-nav__brand-image--mobile"
            :src="brandMobileLogoUrl"
            alt=""
            aria-hidden="true"
          >
          <span
            v-else-if="brandMode === 'mark'"
            class="story-chapter-nav__mark"
            aria-hidden="true"
          >
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="currentColor" stroke-width="3.2">
                <circle cx="50" cy="50" r="44" />
                <ellipse cx="50" cy="50" rx="44" ry="20" />
                <ellipse cx="50" cy="50" rx="44" ry="20" transform="rotate(45 50 50)" />
                <ellipse cx="50" cy="50" rx="44" ry="20" transform="rotate(90 50 50)" />
                <ellipse cx="50" cy="50" rx="44" ry="20" transform="rotate(135 50 50)" />
              </g>
            </svg>
          </span>
          <span v-else>{{ brandLabelText }}</span>
        </button>

        <button
          v-if="!expanded && currentLabel"
          type="button"
          class="story-chapter-nav__current"
          data-story-chapter-current
          data-au-track="chapter-nav"
          :data-au-label="currentTrackLabel"
          data-au-modifier="current"
          :aria-current="activeChapter ? 'step' : undefined"
          @click="onCurrentClick"
        >
          <span class="story-chapter-nav__dot" aria-hidden="true" />
          <span>{{ currentLabel }}</span>
        </button>

        <div
          v-show="expanded"
          class="story-chapter-nav__chapters"
          @mouseleave="openMenuId = null"
        >
          <div
            v-for="(chapter, index) in normalizedChapters"
            :key="chapter.id"
            class="story-chapter-nav__item"
            data-story-chapter-item-wrapper
            :class="{ 'is-open': openMenuId === chapter.id }"
            @pointerenter="onChapterPointerEnter($event, chapter)"
          >
            <button
              type="button"
              class="story-chapter-nav__chip"
              data-story-chapter-item
              :class="{ 'is-active': index === activeIndex, 'is-past': activeIndex >= 0 && index < activeIndex }"
              :aria-current="index === activeIndex ? 'step' : undefined"
              :aria-haspopup="chapter.children?.length ? 'menu' : undefined"
              :aria-expanded="chapter.children?.length ? openMenuId === chapter.id : undefined"
              data-au-track="chapter-nav"
              :data-au-label="chapter.id"
              :data-au-modifier="index === activeIndex ? 'active' : 'chapter'"
              @click="onChapterClick(chapter)"
            >
              <span>{{ chapterLabel(chapter) }}</span>
              <svg
                v-if="chapter.children?.length"
                class="story-chapter-nav__caret"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <div
              v-if="chapter.children?.length && openMenuId === chapter.id"
              class="story-chapter-nav__menu"
              role="menu"
            >
              <button
                v-for="child in chapter.children"
                :key="child.id"
                type="button"
                class="story-chapter-nav__menu-item"
                data-story-chapter-menu-item
                :class="{ 'is-active': containsScene(child, activeSceneKey) }"
                role="menuitem"
                data-au-track="chapter-nav"
                :data-au-label="child.id"
                data-au-modifier="child"
                @click="jumpTo(child)"
              >
                {{ chapterLabel(child) }}
              </button>
            </div>
          </div>

        </div>

        <button
          v-if="ctaAction === 'share' && !props.ctaDetached"
          class="story-chapter-nav__cta story-chapter-nav__cta--rail"
          data-story-chapter-cta
          data-au-track="chapter-nav"
          :data-au-label="ctaTrackLabel"
          :data-au-modifier="ctaShareOutcome ? `share-${ctaShareOutcome}` : 'share'"
          :aria-label="ctaLabel"
          type="button"
          data-story-chapter-cta-share
          @click="onCtaShare"
        >
                    <span class="story-chapter-nav__cta-label">{{ ctaShareOutcome === 'copied' ? 'Link copied' : ctaLabel }}</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v8M5 5l3-3 3 3M3 9v3.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <component
          v-if="ctaAction === 'link' && ctaUrl && !props.ctaDetached"
          :is="openCtaDialog ? 'button' : 'a'"
          :type="openCtaDialog ? 'button' : undefined"
          :aria-haspopup="openCtaDialog ? 'dialog' : undefined"
          @click="openCtaDialog?.($event)"
          :href="openCtaDialog ? undefined : ctaUrl"
          :target="openCtaDialog ? undefined : ctaTarget"
          :rel="openCtaDialog ? undefined : ctaRel"
          :download="openCtaDialog ? undefined : ctaDownloadFilename"
          class="story-chapter-nav__cta story-chapter-nav__cta--rail"
          data-story-chapter-cta
          data-au-track="chapter-nav"
          :data-au-label="ctaTrackLabel"
          :data-au-modifier="ctaTrackModifier"
          :aria-label="ctaAriaLabel"
        >
          <svg v-if="ctaDownloadFilename" width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 2v9m0 0L5 7m4 4 4-4M3 14.5h12" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="story-chapter-nav__cta-label">{{ ctaLabel }}</span>
          <svg v-if="!ctaDownloadFilename" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </component>

        <button
          v-if="showToggleControl"
          type="button"
          class="story-chapter-nav__toggle"
          data-story-chapter-toggle
          :aria-expanded="expanded"
          :aria-label="expanded ? 'Collapse chapters' : 'Expand chapters'"
          @click="toggleExpanded"
        >
          <svg
            v-if="expanded"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <svg
            v-else
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M4 6h12M4 10h12M4 14h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>

        <button
          v-if="ctaAction === 'share'"
          class="story-chapter-nav__cta story-chapter-nav__cta--icon"
          data-story-chapter-cta
          data-au-track="chapter-nav"
          :data-au-label="ctaTrackLabel"
          :data-au-modifier="ctaShareOutcome ? `share-${ctaShareOutcome}` : 'share'"
          :aria-label="ctaLabel"
          type="button"
          data-story-chapter-cta-share
          @click="onCtaShare"
        >
                    <span class="story-chapter-nav__cta-label">{{ ctaShareOutcome === 'copied' ? 'Link copied' : ctaLabel }}</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v8M5 5l3-3 3 3M3 9v3.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <component
          v-if="ctaAction === 'link' && ctaUrl"
          :is="openCtaDialog ? 'button' : 'a'"
          :type="openCtaDialog ? 'button' : undefined"
          :aria-haspopup="openCtaDialog ? 'dialog' : undefined"
          @click="openCtaDialog?.($event)"
          :href="openCtaDialog ? undefined : ctaUrl"
          :target="openCtaDialog ? undefined : ctaTarget"
          :rel="openCtaDialog ? undefined : ctaRel"
          :download="openCtaDialog ? undefined : ctaDownloadFilename"
          class="story-chapter-nav__cta story-chapter-nav__cta--icon"
          data-story-chapter-cta
          data-au-track="chapter-nav"
          :data-au-label="ctaTrackLabel"
          :data-au-modifier="ctaTrackModifier"
          :aria-label="ctaAriaLabel"
        >
          <svg v-if="ctaDownloadFilename" width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1v6.5m0 0L3.3 4.8m2.7 2.7 2.7-2.7M1.5 10h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="story-chapter-nav__cta-label">{{ ctaLabel }}</span>
          <svg v-if="!ctaDownloadFilename" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </component>
      </div>

    </nav>

    <button
      v-if="ctaAction === 'share' && props.ctaDetached"
      :style="navStyle"
      class="story-chapter-nav__cta story-chapter-nav__cta--rail story-chapter-nav__cta--detached"
      data-story-chapter-cta
      data-au-track="chapter-nav"
      :data-au-label="ctaTrackLabel"
      :data-au-modifier="ctaShareOutcome ? `share-${ctaShareOutcome}` : 'share'"
      :aria-label="ctaLabel"
      type="button"
      data-story-chapter-cta-share
      @click="onCtaShare"
    >
            <span class="story-chapter-nav__cta-label">{{ ctaShareOutcome === 'copied' ? 'Link copied' : ctaLabel }}</span>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v8M5 5l3-3 3 3M3 9v3.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
    <component
      v-if="ctaAction === 'link' && ctaUrl && props.ctaDetached"
      :is="openCtaDialog ? 'button' : 'a'"
      :type="openCtaDialog ? 'button' : undefined"
      :aria-haspopup="openCtaDialog ? 'dialog' : undefined"
      @click="openCtaDialog?.($event)"
      :href="openCtaDialog ? undefined : ctaUrl"
      :target="openCtaDialog ? undefined : ctaTarget"
      :rel="openCtaDialog ? undefined : ctaRel"
      :download="openCtaDialog ? undefined : ctaDownloadFilename"
      :style="navStyle"
      class="story-chapter-nav__cta story-chapter-nav__cta--rail story-chapter-nav__cta--detached"
      data-story-chapter-cta
      data-au-track="chapter-nav"
      :data-au-label="ctaTrackLabel"
      :data-au-modifier="ctaTrackModifier"
      :aria-label="ctaAriaLabel"
    >
      <svg v-if="ctaDownloadFilename" width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 2v9m0 0L5 7m4 4 4-4M3 14.5h12" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="story-chapter-nav__cta-label">{{ ctaLabel }}</span>
      <svg v-if="!ctaDownloadFilename" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </component>
  </Teleport>
</template>

<style src="../../assets/css/story-chapter-nav.css"></style>
