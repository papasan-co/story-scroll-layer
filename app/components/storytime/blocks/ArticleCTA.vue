<script setup lang="ts">
import { computed, ref } from 'vue'

type CtaActionType = 'url' | 'modal' | 'scroll'
type CtaStyle = 'primary' | 'secondary'

type CtaAction = {
  label?: string
  action?: CtaActionType
  target?: string
  style?: CtaStyle
}

const props = withDefaults(defineProps<{
  pre?: string
  preColor?: string
  headline?: string
  caption?: string
  actions?: CtaAction[]
}>(), {
  pre: '',
  preColor: 'text-[var(--brand-primary)]',
  headline: '',
  caption: '',
})

const open = ref(false)

const action = computed(() => {
  const first = Array.isArray(props.actions) ? props.actions[0] : null
  if (!first || typeof first !== 'object') return null
  const label = typeof first.label === 'string' ? first.label.trim() : ''
  const target = typeof first.target === 'string' ? first.target.trim() : ''
  if (!label || !target) return null
  return {
    label,
    target,
    action: first.action ?? 'url',
    style: first.style ?? 'primary',
  }
})

const actionClasses = computed(() => {
  if (!action.value) return ''
  const base = 'inline-flex items-center gap-2 font-bold px-4 py-2 rounded-lg transition'
  const primary = 'bg-[var(--story-cta-bg)] text-[var(--story-cta-text)] hover:brightness-105'
  const secondary = 'border border-[var(--story-cta-bg)] text-[var(--story-cta-bg)] hover:opacity-90'
  return `${base} ${action.value.style === 'secondary' ? secondary : primary}`
})

function handleScroll(target: string) {
  if (!import.meta.client) return
  const el = document.querySelector(target)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section class="max-w-[720px] mx-auto text-left pointer-events-auto [font-family:var(--story-font-body)]">
    <p v-if="props.pre" :class="['uppercase tracking-widest font-bold text-sm mb-1', props.preColor]">{{ props.pre }}</p>
    <h3
      v-if="props.headline"
      class="font-extrabold text-xl text-[var(--story-narrative-text)] mb-1 [font-family:var(--story-font-heading)]"
    >
      {{ props.headline }}
    </h3>
    <p v-if="props.caption" class="text-lg text-[var(--story-narrative-text)]/85 mb-3">{{ props.caption }}</p>

    <template v-if="action">
      <a
        v-if="action.action === 'url'"
        :href="action.target"
        :class="actionClasses"
      >
        {{ action.label }}
      </a>

      <button
        v-else-if="action.action === 'modal'"
        :class="actionClasses"
        type="button"
        @click="open = true"
      >
        {{ action.label }}
      </button>

      <button
        v-else
        :class="actionClasses"
        type="button"
        @click="handleScroll(action.target)"
      >
        {{ action.label }}
      </button>
    </template>

    <ClientOnly>
      <Teleport to="body">
        <div v-if="open" class="fixed inset-0 bg-[rgba(44,50,78,.55)] grid place-items-center z-60" @click.self="open = false">
          <div class="relative w-[min(560px,92vw)] bg-white rounded-2xl p-5 border border-[#d2d7dc] shadow-2xl">
            <button class="absolute right-3 top-2 text-2xl text-[#475569]" aria-label="Close" @click="open = false">×</button>
            <iframe :src="action?.target" width="100%" height="180" style="border:1px solid #d2d7dc; background:#fff" frameborder="0" scrolling="no" />
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </section>
</template>
