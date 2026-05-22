<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  StoryChapter,
  StoryChapterNavBrandPresentation,
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
  variant?: 'default' | 'we2'
  showToggle?: boolean
  brand?: StoryChapterNavBrandPresentation | null
  cta?: StoryChapterNavCtaPresentation | null
  darkSceneKeys?: string[]
}>(), {
  brandLabel: '',
  ariaLabel: 'Story chapters',
  variant: 'default',
  showToggle: true,
  brand: null,
  cta: null,
  darkSceneKeys: () => [],
})

const emit = defineEmits<{
  jump: [sceneKeys: string[]]
}>()

const expanded = ref(false)
const openMenuId = ref<string | null>(null)
const rootEl = ref<HTMLElement | null>(null)

const normalizedChapters = computed(() => props.chapters || [])
const navVariant = computed(() => props.variant === 'we2' ? 'we2' : 'default')
const sceneTheme = computed<'light' | 'dark'>(() => {
  if (navVariant.value !== 'we2') return 'light'
  return props.darkSceneKeys.includes(props.activeSceneKey) ? 'dark' : 'light'
})
const brandPresentation = computed<StoryChapterNavBrandPresentation>(() => props.brand || {})
const brandLabelText = computed(() => brandPresentation.value.label || props.brandLabel || '')
const showBrand = computed(() => Boolean(brandLabelText.value || brandPresentation.value.variant))
const showToggleControl = computed(() => props.showToggle !== false)
const ctaPresentation = computed<StoryChapterNavCtaPresentation>(() => props.cta || {})
const ctaUrl = computed(() => typeof ctaPresentation.value.url === 'string' ? ctaPresentation.value.url.trim() : '')
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
    : `${ctaLabel.value}${ctaTarget.value === '_blank' ? ' (opens in new tab)' : ''}`
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
  return index === -1 ? 0 : index
})

const activeChapter = computed(() => normalizedChapters.value[activeIndex.value])

function jumpTo(chapter: ChapterLike) {
  const sceneKeys = chapterSceneKeys(chapter)
  if (!sceneKeys.length) return

  emit('jump', sceneKeys)
  openMenuId.value = null

  if (window.innerWidth < 1024) {
    expanded.value = false
  }
}

function onChapterClick(chapter: ChapterLike) {
  if (chapter.children?.length) {
    openMenuId.value = openMenuId.value === chapter.id ? null : chapter.id
    return
  }

  jumpTo(chapter)
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
  <Teleport to="body">
    <nav
      ref="rootEl"
      class="story-chapter-nav"
      :class="[
        `story-chapter-nav--${navVariant}`,
        `story-chapter-nav--${sceneTheme}`,
        { 'is-expanded': expanded },
      ]"
      :aria-label="ariaLabel"
    >
      <div class="story-chapter-nav__bar">
        <button
          v-if="showBrand"
          type="button"
          class="story-chapter-nav__brand story-chapter-nav__chip"
          data-au-track="chapter-nav"
          data-au-label="brand"
          data-au-modifier="cover"
          :aria-label="brandLabelText || 'Back to cover'"
          @click="onBrandClick"
        >
          <span
            v-if="brandPresentation.variant === 'we2-mark'"
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
          v-if="!expanded && activeChapter"
          type="button"
          class="story-chapter-nav__current story-chapter-nav__chip"
          data-au-track="chapter-nav"
          :data-au-label="activeChapter.id"
          data-au-modifier="current"
          aria-current="step"
          @click="jumpTo(activeChapter)"
        >
          <span class="story-chapter-nav__dot" aria-hidden="true" />
          <span>{{ chapterLabel(activeChapter) }}</span>
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
            :class="{ 'is-open': openMenuId === chapter.id }"
            @mouseenter="chapter.children?.length ? (openMenuId = chapter.id) : null"
          >
            <button
              type="button"
              class="story-chapter-nav__chip"
              :class="{ 'is-active': index === activeIndex, 'is-past': index < activeIndex }"
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

          <a
            v-if="ctaUrl"
            :href="ctaUrl"
            :target="ctaTarget"
            :rel="ctaRel"
            :download="ctaDownloadFilename"
            class="story-chapter-nav__chip story-chapter-nav__cta story-chapter-nav__cta--rail"
            data-au-track="chapter-nav"
            :data-au-label="ctaTrackLabel"
            :data-au-modifier="ctaTrackModifier"
            :aria-label="ctaAriaLabel"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 2v9m0 0L5 7m4 4 4-4M3 14.5h12" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="story-chapter-nav__cta-label">{{ ctaLabel }}</span>
          </a>
        </div>

        <button
          v-if="showToggleControl"
          type="button"
          class="story-chapter-nav__toggle story-chapter-nav__chip"
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

        <a
          v-if="ctaUrl"
          :href="ctaUrl"
          :target="ctaTarget"
          :rel="ctaRel"
          :download="ctaDownloadFilename"
          class="story-chapter-nav__chip story-chapter-nav__cta story-chapter-nav__cta--icon"
          data-au-track="chapter-nav"
          :data-au-label="ctaTrackLabel"
          :data-au-modifier="ctaTrackModifier"
          :aria-label="ctaAriaLabel"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1v6.5m0 0L3.3 4.8m2.7 2.7 2.7-2.7M1.5 10h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="story-chapter-nav__cta-label">{{ ctaLabel }}</span>
        </a>
      </div>
    </nav>
  </Teleport>
</template>

<style scoped>
.story-chapter-nav {
  position: fixed;
  z-index: 1100;
  top: calc(16px + env(safe-area-inset-top, 0px));
  left: 50%;
  width: min(calc(100vw - 24px), 1080px);
  transform: translateX(-50%);
  color: var(--story-chapter-nav-text, var(--story-visual-text, #111111));
  pointer-events: none;
}

.story-chapter-nav__bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  padding: 5px;
  border: 1px solid var(--story-chapter-nav-border, color-mix(in srgb, currentColor 14%, transparent));
  border-radius: 999px;
  background: var(--story-chapter-nav-bg, color-mix(in srgb, var(--story-visual-bg, #ffffff) 78%, transparent));
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  pointer-events: auto;
}

.story-chapter-nav__chapters {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.story-chapter-nav__item {
  position: relative;
}

.story-chapter-nav__chip,
.story-chapter-nav__menu-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease;
}

.story-chapter-nav__chip {
  padding: 0 12px;
}

.story-chapter-nav__brand {
  font-weight: 700;
  text-transform: uppercase;
}

.story-chapter-nav__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: #0c0a2e;
  color: #f5f1e3;
}

.story-chapter-nav__mark svg {
  display: block;
  width: 17px;
  height: 17px;
}

.story-chapter-nav__current {
  max-width: min(48vw, 280px);
}

.story-chapter-nav__current span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
}

.story-chapter-nav__dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--story-chapter-nav-active, var(--story-accent, currentColor));
}

.story-chapter-nav__chip:hover,
.story-chapter-nav__menu-item:hover,
.story-chapter-nav__chip.is-active {
  background: var(--story-chapter-nav-active-bg, color-mix(in srgb, currentColor 12%, transparent));
}

.story-chapter-nav__chip.is-past {
  opacity: 0.72;
}

.story-chapter-nav__toggle {
  width: 34px;
  padding: 0;
}

.story-chapter-nav__toggle svg,
.story-chapter-nav__caret {
  width: 14px;
  height: 14px;
}

.story-chapter-nav__menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  min-width: 180px;
  padding: 6px;
  transform: translateX(-50%);
  border: 1px solid var(--story-chapter-nav-border, color-mix(in srgb, currentColor 14%, transparent));
  border-radius: 8px;
  background: var(--story-chapter-nav-bg, color-mix(in srgb, var(--story-visual-bg, #ffffff) 92%, transparent));
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
}

.story-chapter-nav__menu-item {
  width: 100%;
  justify-content: flex-start;
  min-height: 32px;
  padding: 0 10px;
}

.story-chapter-nav__menu-item.is-active {
  background: var(--story-chapter-nav-active-bg, color-mix(in srgb, currentColor 12%, transparent));
}

.story-chapter-nav--we2 {
  top: calc(16px + env(safe-area-inset-top, 0px));
  width: auto;
  max-width: calc(100vw - 32px);
  color: #0c0a2e;
  font-family: 'Poppins', Inter, ui-sans-serif, system-ui, sans-serif;
  pointer-events: none;
  user-select: none;
}

.story-chapter-nav--we2.story-chapter-nav--dark {
  color: #f5f1e3;
}

.story-chapter-nav--we2 .story-chapter-nav__bar {
  align-items: stretch;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  border: none;
  border-radius: 18px;
  box-shadow: none;
  backdrop-filter: blur(40px) saturate(140%);
  -webkit-backdrop-filter: blur(40px) saturate(140%);
  transition: background-color 0.35s ease;
}

.story-chapter-nav--we2.story-chapter-nav--light .story-chapter-nav__bar {
  background: rgba(255, 255, 255, 0.78);
}

.story-chapter-nav--we2.story-chapter-nav--dark .story-chapter-nav__bar {
  background: rgba(12, 10, 46, 0.58);
}

.story-chapter-nav--we2 .story-chapter-nav__chapters {
  gap: 4px;
}

.story-chapter-nav--we2 .story-chapter-nav__chip {
  min-height: 32px;
  height: 32px;
  padding: 0 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.story-chapter-nav--we2 .story-chapter-nav__brand {
  width: 32px;
  min-width: 32px;
  padding: 0;
  border-radius: 50%;
}

.story-chapter-nav--we2.story-chapter-nav--dark .story-chapter-nav__mark {
  box-shadow: 0 0 0 1px rgba(245, 241, 227, 0.22);
}

.story-chapter-nav--we2 .story-chapter-nav__dot {
  width: 6px;
  height: 6px;
  background: currentColor;
}

.story-chapter-nav--we2 .story-chapter-nav__caret {
  width: 9px;
  height: 9px;
}

.story-chapter-nav--we2 .story-chapter-nav__chip:hover,
.story-chapter-nav--we2 .story-chapter-nav__menu-item:hover,
.story-chapter-nav--we2 .story-chapter-nav__chip.is-active {
  background: rgba(12, 10, 46, 0.08);
}

.story-chapter-nav--we2.story-chapter-nav--dark .story-chapter-nav__chip:hover,
.story-chapter-nav--we2.story-chapter-nav--dark .story-chapter-nav__menu-item:hover,
.story-chapter-nav--we2.story-chapter-nav--dark .story-chapter-nav__chip.is-active {
  background: rgba(255, 255, 255, 0.14);
}

.story-chapter-nav--we2 .story-chapter-nav__chip.is-active {
  background: rgba(12, 10, 46, 0.12);
  font-weight: 700;
}

.story-chapter-nav--we2.story-chapter-nav--dark .story-chapter-nav__chip.is-active {
  background: rgba(255, 255, 255, 0.18);
}

.story-chapter-nav--we2 .story-chapter-nav__chip.is-past {
  opacity: 0.55;
}

.story-chapter-nav--we2 .story-chapter-nav__toggle {
  width: 32px;
  padding: 0;
}

.story-chapter-nav--we2 .story-chapter-nav__cta {
  background: #f5c84c;
  color: #0c0a2e !important;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.story-chapter-nav--we2 .story-chapter-nav__cta:hover {
  background: #ffd66a !important;
}

.story-chapter-nav--we2 .story-chapter-nav__cta-label {
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: none;
}

.story-chapter-nav--we2 .story-chapter-nav__cta--rail {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
}

.story-chapter-nav--we2 .story-chapter-nav__cta--icon {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
}

.story-chapter-nav--we2 .story-chapter-nav__cta--icon .story-chapter-nav__cta-label {
  display: none;
}

.story-chapter-nav--we2 .story-chapter-nav__menu {
  min-width: 220px;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  background: rgba(12, 10, 46, 0.86);
  box-shadow: 0 18px 48px rgba(12, 10, 46, 0.42);
}

.story-chapter-nav--we2 .story-chapter-nav__menu-item {
  min-height: 32px;
  padding: 8px 14px;
  border-radius: 8px;
  color: rgba(245, 241, 227, 0.88);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.story-chapter-nav--we2 .story-chapter-nav__menu-item.is-active {
  background: rgba(245, 200, 76, 0.16);
  color: #f5c84c;
  font-weight: 600;
}

@media (min-width: 1024px) {
  .story-chapter-nav--we2 .story-chapter-nav__toggle,
  .story-chapter-nav--we2 .story-chapter-nav__current {
    display: none;
  }

  .story-chapter-nav--we2 .story-chapter-nav__cta--icon {
    display: none;
  }
}

@media (max-width: 1023.98px) {
  .story-chapter-nav {
    top: calc(10px + env(safe-area-inset-top, 0px));
    width: min(calc(100vw - 16px), 680px);
  }

  .story-chapter-nav__bar {
    width: 100%;
    justify-content: space-between;
    border-radius: 8px;
  }

  .story-chapter-nav__chapters {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    justify-content: flex-start;
    padding: 6px;
    border: 1px solid var(--story-chapter-nav-border, color-mix(in srgb, currentColor 14%, transparent));
    border-radius: 8px;
    background: var(--story-chapter-nav-bg, color-mix(in srgb, var(--story-visual-bg, #ffffff) 92%, transparent));
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
    backdrop-filter: blur(28px) saturate(140%);
    -webkit-backdrop-filter: blur(28px) saturate(140%);
  }

  .story-chapter-nav__item,
  .story-chapter-nav__chapters .story-chapter-nav__chip {
    width: 100%;
  }

  .story-chapter-nav__chapters .story-chapter-nav__chip {
    justify-content: flex-start;
  }

  .story-chapter-nav__menu {
    position: static;
    min-width: 0;
    margin: 4px 0 6px 16px;
    transform: none;
    box-shadow: none;
  }

  .story-chapter-nav--we2 {
    top: calc(16px + env(safe-area-inset-top, 0px));
    width: auto;
    max-width: calc(100vw - 32px);
  }

  .story-chapter-nav--we2.is-expanded {
    width: calc(100vw - 32px);
  }

  .story-chapter-nav--we2 .story-chapter-nav__bar {
    width: fit-content;
    max-width: 100%;
    justify-content: center;
    flex-wrap: nowrap;
    border-radius: 18px;
  }

  .story-chapter-nav--we2.is-expanded .story-chapter-nav__bar {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .story-chapter-nav--we2 .story-chapter-nav__chapters {
    position: static;
    flex-basis: 100%;
    order: 99;
    flex-direction: column;
    align-items: stretch;
    flex-wrap: nowrap;
    gap: 4px;
    margin-top: 4px;
    padding: 6px 0 0;
    border: 0;
    border-top: 1px solid currentColor;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .story-chapter-nav--we2.story-chapter-nav--light .story-chapter-nav__chapters {
    border-top-color: rgba(12, 10, 46, 0.10);
  }

  .story-chapter-nav--we2.story-chapter-nav--dark .story-chapter-nav__chapters {
    border-top-color: rgba(245, 241, 227, 0.18);
  }

  .story-chapter-nav--we2 .story-chapter-nav__chip {
    min-height: 32px;
    height: 32px;
    padding: 0 10px;
    font-size: 11px;
    letter-spacing: 0.03em;
  }

  .story-chapter-nav--we2 .story-chapter-nav__brand,
  .story-chapter-nav--we2 .story-chapter-nav__toggle {
    width: 32px;
    min-width: 32px;
    padding: 0;
  }

  .story-chapter-nav--we2.is-expanded .story-chapter-nav__toggle {
    margin-left: auto;
  }

  .story-chapter-nav--we2 .story-chapter-nav__item,
  .story-chapter-nav--we2 .story-chapter-nav__chapters .story-chapter-nav__chip {
    width: 100%;
  }

  .story-chapter-nav--we2 .story-chapter-nav__chapters .story-chapter-nav__chip {
    justify-content: center;
  }

  .story-chapter-nav--we2:not(.is-expanded) .story-chapter-nav__cta--rail {
    display: none;
  }

  .story-chapter-nav--we2:not(.is-expanded) .story-chapter-nav__cta--icon {
    display: inline-flex;
  }

  .story-chapter-nav--we2.is-expanded .story-chapter-nav__cta--icon {
    display: none;
  }

  .story-chapter-nav--we2 .story-chapter-nav__mark {
    width: 26px;
    height: 26px;
  }

  .story-chapter-nav--we2 .story-chapter-nav__mark svg {
    width: 17px;
    height: 17px;
  }
}

@media (max-width: 599px) {
  .story-chapter-nav--we2 {
    top: calc(12px + env(safe-area-inset-top, 0px));
    max-width: calc(100vw - 16px);
  }

  .story-chapter-nav--we2.is-expanded {
    width: calc(100vw - 16px);
  }

  .story-chapter-nav--we2 .story-chapter-nav__bar {
    border-radius: 20px;
  }

  .story-chapter-nav--we2 .story-chapter-nav__chip {
    min-height: 36px;
    height: 36px;
    padding: 0 12px;
    font-size: 12px;
    letter-spacing: 0.04em;
  }

  .story-chapter-nav--we2 .story-chapter-nav__brand,
  .story-chapter-nav--we2 .story-chapter-nav__toggle {
    width: 36px;
    min-width: 36px;
    padding: 0;
  }

  .story-chapter-nav--we2 .story-chapter-nav__mark {
    width: 28px;
    height: 28px;
  }

  .story-chapter-nav--we2 .story-chapter-nav__mark svg {
    width: 18px;
    height: 18px;
  }

  .story-chapter-nav--we2 .story-chapter-nav__toggle svg {
    width: 16px;
    height: 16px;
  }
}
</style>
