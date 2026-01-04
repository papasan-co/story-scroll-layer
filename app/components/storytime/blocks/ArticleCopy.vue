<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  pre?: string
  preColor?: string
  title?: string
  titleColor?: string
  highlight?: string
  paragraphs?: string[]
  refLink?: { label: string; url: string }
  align?: 'left' | 'center' | 'right'
  ctaLabel?: string
  ctaModalUrl?: string
  ctaColor?: string
}>(), {
  ctaColor: '#007c7e',
})

const open = ref(false)
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
      <br v-if="highlight" />
      <span v-if="highlight" class="text-[#f55742]" v-html="highlight" />
    </h2>

    <p
      v-for="(p, i) in paragraphs"
      :key="i"
      class="text-lg text-gray-700 lg:dark:text-white"
      v-html="p"
    />

    <a
      v-if="refLink"
      :href="refLink.url"
      target="_blank"
      rel="noopener noreferrer"
      class="self-start inline-block text-xs text-gray-600 bg-gray-100 border border-gray-200
             rounded-full px-2 py-0.5 hover:bg-gray-200 hover:border-gray-300
             transition-colors duration-200"
    >
      {{ refLink.label }}
    </a>

    <button
      v-if="ctaLabel && ctaModalUrl"
      type="button"
      class="self-start inline-flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-lg hover:brightness-105 transition"
      :style="{ backgroundColor: ctaColor }"
      @click="open = true"
    >
      {{ ctaLabel }}
    </button>

    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="open"
          class="fixed inset-0 bg-[rgba(44,50,78,.55)] grid place-items-center z-50"
          @click.self="open = false"
        >
          <div class="relative w-[min(560px,92vw)] bg-white rounded-2xl p-5 border border-[#d2d7dc] shadow-2xl">
            <button class="absolute right-3 top-2 text-2xl text-[#475569]" aria-label="Close" @click="open = false">×</button>
            <iframe :src="ctaModalUrl" width="100%" height="180" style="border:1px solid #d2d7dc; background:#fff" frameborder="0" scrolling="no" />
            <p class="mt-2 text-xs text-gray-500">Powered by Substack</p>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

