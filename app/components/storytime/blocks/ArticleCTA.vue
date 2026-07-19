<script setup lang="ts">
import { computed, ref } from 'vue'

type CtaActionType = 'url' | 'modal' | 'scroll'
type CtaStyle = 'primary' | 'secondary'
type CtaVariant = 'inline' | 'card-grid'

type CtaAction = {
  label?: string
  action?: CtaActionType
  target?: string
  style?: CtaStyle
  heading?: string
  description?: string
  color?: string
  textColor?: string
  modifier?: string
}

const props = withDefaults(defineProps<{
  eyebrow?: string
  pre?: string
  preColor?: string
  headline?: string
  caption?: string
  variant?: CtaVariant
  actions?: CtaAction[]
}>(), {
  pre: '',
  preColor: 'text-[var(--brand-primary)]',
  headline: '',
  caption: '',
  variant: 'inline',
})

const openTarget = ref('')

const eyebrow = computed(() => {
  const canonical = typeof props.eyebrow === 'string' ? props.eyebrow.trim() : ''
  const legacy = typeof props.pre === 'string' ? props.pre.trim() : ''

  return canonical || legacy
})

const actions = computed(() =>
  (Array.isArray(props.actions) ? props.actions : [])
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const label = typeof item.label === 'string' ? item.label.trim() : ''
      const target = typeof item.target === 'string' ? item.target.trim() : ''
      if (!label || !target) return null

      return {
        label,
        target,
        action: item.action ?? 'url',
        style: item.style ?? 'primary',
        heading: typeof item.heading === 'string' ? item.heading.trim() : '',
        description: typeof item.description === 'string' ? item.description.trim() : '',
        color: typeof item.color === 'string' ? item.color.trim() : '',
        textColor: typeof item.textColor === 'string' ? item.textColor.trim() : '',
        modifier: typeof item.modifier === 'string' ? item.modifier.trim() : '',
      }
    })
    .filter((item): item is Required<CtaAction> => item !== null),
)

function actionClasses(action: Required<CtaAction>, inCard = false) {
  const base = `inline-flex items-center gap-2 font-bold px-4 ${inCard ? 'py-3' : 'py-2'} rounded-lg transition`
  const width = inCard ? ' w-full justify-center' : ''
  const primary = 'bg-[var(--article-cta-action-bg,var(--story-cta-bg))] text-[var(--article-cta-action-text,var(--story-cta-text))] hover:brightness-105'
  const secondary = 'border border-[var(--story-cta-bg)] text-[var(--story-cta-bg)] hover:opacity-90'
  return `${base}${width} ${action.style === 'secondary' ? secondary : primary}`
}

function actionStyle(action: Required<CtaAction>) {
  const styles: Record<string, string> = {}
  if (action.color) styles['--article-cta-action-bg'] = action.color
  if (action.textColor) styles['--article-cta-action-text'] = action.textColor
  return Object.keys(styles).length ? styles : undefined
}

function actionModifier(action: Required<CtaAction>) {
  return action.modifier || action.action
}

function targetAttr(action: Required<CtaAction>) {
  if (action.action !== 'url' || action.target.startsWith('mailto:')) return undefined
  return '_blank'
}

function relAttr(action: Required<CtaAction>) {
  return targetAttr(action) === '_blank' ? 'noopener noreferrer' : undefined
}

function openModal(target: string) {
  openTarget.value = target
}

function closeModal() {
  openTarget.value = ''
}

function handleScroll(target: string) {
  if (!import.meta.client) return
  const el = document.querySelector(target)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section
    class="article-cta-root max-w-[720px] mx-auto text-left pointer-events-auto [font-family:var(--story-font-body)]"
    :class="{ 'article-cta-root--card-grid': variant === 'card-grid' }"
  >
    <p v-if="eyebrow" :class="['article-cta-eyebrow uppercase tracking-widest font-bold text-sm mb-1', props.preColor]">{{ eyebrow }}</p>
    <h3
      v-if="props.headline"
      class="article-cta-headline font-extrabold text-xl text-[var(--story-narrative-text)] mb-1 [font-family:var(--story-font-heading)]"
    >
      {{ props.headline }}
    </h3>
    <p v-if="props.caption" class="article-cta-caption text-lg text-[var(--story-narrative-text)]/85 mb-3">{{ props.caption }}</p>

    <div v-if="actions.length && variant === 'card-grid'" class="article-cta-card-grid">
      <article
        v-for="action in actions"
        :key="`${action.action}:${action.target}:${action.label}`"
        class="article-cta-card"
      >
        <h4 v-if="action.heading" class="article-cta-card__heading">{{ action.heading }}</h4>
        <p v-if="action.description" class="article-cta-card__description">{{ action.description }}</p>

        <a
          v-if="action.action === 'url'"
          :href="action.target"
          :target="targetAttr(action)"
          :rel="relAttr(action)"
          :class="actionClasses(action, true)"
          :style="actionStyle(action)"
          data-au-track="cta"
          :data-au-label="action.label"
          :data-au-modifier="actionModifier(action)"
        >
          {{ action.label }}
        </a>

        <button
          v-else-if="action.action === 'modal'"
          :class="actionClasses(action, true)"
          :style="actionStyle(action)"
          type="button"
          data-au-track="cta"
          :data-au-label="action.label"
          :data-au-modifier="actionModifier(action)"
          @click="openModal(action.target)"
        >
          {{ action.label }}
        </button>

        <button
          v-else
          :class="actionClasses(action, true)"
          :style="actionStyle(action)"
          type="button"
          data-au-track="cta"
          :data-au-label="action.label"
          :data-au-modifier="actionModifier(action)"
          @click="handleScroll(action.target)"
        >
          {{ action.label }}
        </button>
      </article>
    </div>

    <div v-else-if="actions.length" class="flex flex-wrap gap-3">
      <a
        v-for="action in actions.filter((item) => item.action === 'url')"
        :key="`${action.action}:${action.target}:${action.label}`"
        :href="action.target"
        :target="targetAttr(action)"
        :rel="relAttr(action)"
        :class="actionClasses(action)"
        :style="actionStyle(action)"
        data-au-track="cta"
        :data-au-label="action.label"
        :data-au-modifier="actionModifier(action)"
      >
        {{ action.label }}
      </a>

      <button
        v-for="action in actions.filter((item) => item.action === 'modal')"
        :key="`${action.action}:${action.target}:${action.label}`"
        :class="actionClasses(action)"
        :style="actionStyle(action)"
        type="button"
        data-au-track="cta"
        :data-au-label="action.label"
        :data-au-modifier="actionModifier(action)"
        @click="openModal(action.target)"
      >
        {{ action.label }}
      </button>

      <button
        v-for="action in actions.filter((item) => item.action === 'scroll')"
        :key="`${action.action}:${action.target}:${action.label}`"
        :class="actionClasses(action)"
        :style="actionStyle(action)"
        type="button"
        data-au-track="cta"
        :data-au-label="action.label"
        :data-au-modifier="actionModifier(action)"
        @click="handleScroll(action.target)"
      >
        {{ action.label }}
      </button>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <div v-if="openTarget" class="fixed inset-0 bg-[rgba(44,50,78,.55)] grid place-items-center z-60" @click.self="closeModal">
          <div class="relative w-[min(560px,92vw)] bg-white rounded-2xl p-5 border border-[#d2d7dc] shadow-2xl">
            <button class="absolute right-3 top-2 text-2xl text-[#475569]" aria-label="Close" @click="closeModal">×</button>
            <iframe :src="openTarget" width="100%" height="180" style="border:1px solid #d2d7dc; background:#fff" frameborder="0" scrolling="no" />
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </section>
</template>

<style scoped>
.article-cta-root--card-grid {
  width: min(100%, 56rem);
  max-width: 56rem;
  padding: 3rem;
  border-radius: 1rem;
  background: #ffffff;
  color: #0f172a;
  text-align: center;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
}

.article-cta-root--card-grid .article-cta-headline {
  margin: 0 0 1rem;
  color: #0f172a;
  font-size: clamp(1.875rem, 4vw, 2.25rem);
  line-height: clamp(2.25rem, 4.4vw, 2.5rem);
  letter-spacing: -0.02em;
}

.article-cta-root--card-grid .article-cta-caption {
  max-width: 42rem;
  margin: 0 auto 2.5rem;
  color: #475569;
  font-size: 1.125rem;
  line-height: 1.6;
}

.article-cta-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.article-cta-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.article-cta-card__heading {
  margin: 0 0 0.75rem;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 700;
}

.article-cta-card__description {
  flex: 1;
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.55;
}

.article-cta-card a,
.article-cta-card button {
  margin-top: 1.5rem;
}

@media (max-width: 768px) {
  .article-cta-root--card-grid {
    padding: 2rem 1.25rem;
  }
}
</style>
