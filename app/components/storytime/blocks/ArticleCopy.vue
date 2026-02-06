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
}

const props = withDefaults(defineProps<{
  pre?: string
  preColor?: string
  title?: string
  titleColor?: string
  highlight?: string
  highlightMode?: 'inline' | 'line'
  paragraphs?: string[]
  refLink?: { label: string; url: string }
  align?: 'left' | 'center' | 'right'
  cta?: CopyCta
}>(), {
  highlightMode: 'line',
})

const open = ref(false)

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
  }
})

const ctaClasses = computed(() => {
  if (!cta.value) return ''
  const base = 'inline-flex items-center gap-2 font-semibold px-4 py-2 rounded-lg transition'
  const primary = 'bg-[#007c7e] text-white hover:brightness-105'
  const secondary = 'border border-[#007c7e] text-[#007c7e] hover:bg-[#007c7e]/10'
  const tone = cta.value.tone === 'emphasis' ? 'shadow-lg shadow-[#007c7e]/20' : ''
  return `${base} ${cta.value.style === 'secondary' ? secondary : primary} ${tone}`
})

function handleScroll(target: string) {
  if (!import.meta.client) return
  const el = document.querySelector(target)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div :class="['flex flex-col gap-4', align === 'center' && 'text-center', 'pointer-events-auto']">
    <p
      v-if="pre"
      :class="[
        'uppercase tracking-widest text-md font-semibold',
        preColor || 'text-gray-500',
      ]"
    >
      {{ pre }}
    </p>

    <h2
      v-if="title"
      :class="[
        'text-xl lg:text-2xl font-semibold leading-tight lg:dark:text-white',
        titleColor || 'text-black',
      ]"
    >
      <span v-html="title" />
      <template v-if="highlight && highlightMode === 'line'">
        <br />
        <span class="text-[#f55742]" v-html="highlight" />
      </template>
      <template v-else-if="highlight && highlightMode === 'inline'">
        <span class="text-[#f55742]"> {{ highlight }}</span>
      </template>
    </h2>

    <div
      v-for="(p, i) in paragraphs"
      :key="i"
      class="storytime-copy-block text-lg text-gray-700 lg:dark:text-white"
      v-html="p"
    />

    <a
      v-if="refLink && refLink.label && refLink.url"
      :href="refLink.url"
      target="_blank"
      rel="noopener noreferrer"
      class="self-start inline-block text-xs text-gray-600 bg-gray-100 border border-gray-200
             rounded-full px-2 py-0.5 hover:bg-gray-200 hover:border-gray-300
             transition-colors duration-200"
    >
      {{ refLink.label }}
    </a>

    <template v-if="cta">
      <a
        v-if="cta.action === 'url'"
        :href="cta.target"
        :class="ctaClasses"
      >
        {{ cta.label }}
      </a>

      <button
        v-else-if="cta.action === 'modal'"
        type="button"
        :class="ctaClasses"
        @click="open = true"
      >
        {{ cta.label }}
      </button>

      <button
        v-else
        type="button"
        :class="ctaClasses"
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
  color: #007c7e;
  text-decoration: underline;
}
</style>
