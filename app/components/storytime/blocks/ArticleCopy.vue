<script setup lang="ts">
import { computed, ref } from 'vue'

type CtaActionType = 'url' | 'modal' | 'scroll'
type CtaStyle = 'primary' | 'secondary'
type CtaTone = 'default' | 'emphasis'

type CopyCta = {
  label?: string
  action?: CtaActionType
  target?: string
  style?: CtaStyle
  tone?: CtaTone
  color?: string
  textColor?: string
}

const props = defineProps<{
  eyebrow?: string
  pre?: string
  preColor?: string
  title?: string
  titleColor?: string
  paragraphs?: string[]
  refLink?: { label: string; url: string }
  align?: 'left' | 'center' | 'right'
  cta?: CopyCta
}>()

const open = ref(false)

const eyebrow = computed(() => {
  const canonical = typeof props.eyebrow === 'string' ? props.eyebrow.trim() : ''
  const legacy = typeof props.pre === 'string' ? props.pre.trim() : ''

  return canonical || legacy
})

const cta = computed(() => {
  if (!props.cta || typeof props.cta !== 'object') return null
  const label = typeof props.cta.label === 'string' ? props.cta.label.trim() : ''
  const target = typeof props.cta.target === 'string' ? props.cta.target.trim() : ''
  if (!label || !target) return null
  return {
    label,
    target,
    action: props.cta.action ?? 'url',
    style: props.cta.style ?? 'primary',
    tone: props.cta.tone ?? 'default',
    color: typeof props.cta.color === 'string' ? props.cta.color.trim() : '',
    textColor: typeof props.cta.textColor === 'string' ? props.cta.textColor.trim() : '',
  }
})

const ctaClasses = computed(() => {
  if (!cta.value) return ''
  const base = 'self-start inline-flex items-center gap-2 font-bold px-4 py-2 rounded-lg transition [font-family:var(--story-font-body)]'
  const primary = 'bg-[var(--article-copy-cta-bg,var(--story-cta-bg))] text-[var(--article-copy-cta-text,var(--story-cta-text))] hover:brightness-105'
  const secondary = 'border border-[var(--article-copy-cta-bg,var(--story-cta-bg))] text-[var(--article-copy-cta-bg,var(--story-cta-bg))] hover:opacity-90'
  const tone = cta.value.tone === 'emphasis' ? 'shadow-lg' : ''
  return `${base} ${cta.value.style === 'secondary' ? secondary : primary} ${tone}`
})

const ctaStyle = computed(() => {
  if (!cta.value) return undefined
  const style: Record<string, string> = {}
  if (cta.value.color) style['--article-copy-cta-bg'] = cta.value.color
  if (cta.value.textColor) style['--article-copy-cta-text'] = cta.value.textColor
  return Object.keys(style).length ? style : undefined
})

function handleScroll(target: string) {
  if (!import.meta.client) return
  const el = document.querySelector(target)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function targetAttr(action: { action: CtaActionType; target: string }) {
  if (action.action !== 'url' || action.target.startsWith('mailto:')) return undefined
  return '_blank'
}

function relAttr(action: { action: CtaActionType; target: string }) {
  return targetAttr(action) === '_blank' ? 'noopener noreferrer' : undefined
}
</script>

<template>
  <div :class="['article-copy-root flex flex-col gap-4', align === 'center' && 'text-center', 'pointer-events-auto']">
    <p
      v-if="eyebrow"
      :class="[
        'ac-pre uppercase tracking-widest text-md font-semibold',
        preColor || 'text-[var(--story-narrative-eyebrow,var(--story-narrative-text))]',
      ]"
    >
      {{ eyebrow }}
    </p>

    <h2
      v-if="title"
      :class="[
        'ac-title text-xl lg:text-2xl font-semibold leading-tight [font-family:var(--story-font-heading)]',
        titleColor || 'text-[var(--story-narrative-text)]',
      ]"
    >
      <span v-html="title" />
    </h2>

    <div
      v-for="(p, i) in paragraphs"
      :key="i"
      class="ac-body storytime-copy-block text-lg text-[var(--story-narrative-text)]/85"
      v-html="p"
    />

    <a
      v-if="refLink && refLink.label && refLink.url"
      :href="refLink.url"
      target="_blank"
      rel="noopener noreferrer"
      class="ac-ref-link self-start inline-block text-xs text-[var(--story-narrative-text)]/75 rounded-full px-2 py-0.5 transition-colors duration-200"
      :style="{
        backgroundColor: 'color-mix(in srgb, var(--story-narrative-text) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--story-narrative-text) 20%, transparent)',
      }"
    >
      {{ refLink.label }}
    </a>

    <template v-if="cta">
      <a
        v-if="cta.action === 'url'"
        :href="cta.target"
        :target="targetAttr(cta)"
        :rel="relAttr(cta)"
        :class="ctaClasses"
        :style="ctaStyle"
        data-au-track="cta"
        :data-au-label="cta.label"
        :data-au-modifier="cta.action"
      >
        {{ cta.label }}
      </a>

      <button
        v-else-if="cta.action === 'modal'"
        type="button"
        :class="ctaClasses"
        :style="ctaStyle"
        data-au-track="cta"
        :data-au-label="cta.label"
        :data-au-modifier="cta.action"
        @click="open = true"
      >
        {{ cta.label }}
      </button>

      <button
        v-else
        type="button"
        :class="ctaClasses"
        :style="ctaStyle"
        data-au-track="cta"
        :data-au-label="cta.label"
        :data-au-modifier="cta.action"
        @click="handleScroll(cta.target)"
      >
        {{ cta.label }}
      </button>
    </template>

    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="open"
          class="fixed inset-0 bg-[rgba(44,50,78,.55)] grid place-items-center z-50"
          @click.self="open = false"
        >
          <div class="relative w-[min(560px,92vw)] bg-white rounded-2xl p-5 border border-[#d2d7dc] shadow-2xl">
            <button class="absolute right-3 top-2 text-2xl text-[#475569]" aria-label="Close" @click="open = false">×</button>
            <iframe :src="cta?.target" width="100%" height="180" style="border:1px solid #d2d7dc; background:#fff" frameborder="0" scrolling="no" />
            <p class="mt-2 text-xs text-gray-500">Powered by Substack</p>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<style scoped>
.storytime-copy-block :deep(p) {
  margin: 0;
}

.storytime-copy-block :deep(ul),
.storytime-copy-block :deep(ol) {
  margin: 0.25rem 0 0.25rem 1.25rem;
  padding: 0;
  list-style-position: outside;
}

.storytime-copy-block :deep(ul) {
  list-style-type: disc;
}

.storytime-copy-block :deep(ol) {
  list-style-type: decimal;
}

.storytime-copy-block :deep(a) {
  color: var(--brand-primary, #007c7e);
  text-decoration: underline;
}
</style>
