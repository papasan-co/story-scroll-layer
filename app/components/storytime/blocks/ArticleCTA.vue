<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  pre?: string
  preColor?: string
  headline?: string
  caption?: string
  buttonLabel?: string
  modalUrl?: string
}>(), {
  pre: '',
  preColor: 'text-[#007c7e]',
  headline: 'Stay updated',
  caption: '',
  buttonLabel: 'Learn more',
  modalUrl: '',
})

const open = ref(false)
</script>

<template>
  <section class="max-w-[720px] mx-auto text-left">
    <p v-if="props.pre" :class="['uppercase tracking-widest font-bold text-sm mb-1', props.preColor]">{{ props.pre }}</p>
    <h3 class="font-extrabold text-xl text-[#2c324e] mb-1">{{ props.headline }}</h3>
    <p v-if="props.caption" class="text-lg text-slate-700 mb-3">{{ props.caption }}</p>

    <button
      v-if="props.modalUrl"
      class="bg-[#007c7e] text-white border-0 rounded-lg px-4 py-2 font-bold hover:brightness-105 transition"
      type="button"
      @click="open = true"
    >
      {{ props.buttonLabel }}
    </button>

    <ClientOnly>
      <Teleport to="body">
        <div v-if="open" class="fixed inset-0 bg-[rgba(44,50,78,.55)] grid place-items-center z-60" @click.self="open = false">
          <div class="relative w-[min(560px,92vw)] bg-white rounded-2xl p-5 border border-[#d2d7dc] shadow-2xl">
            <button class="absolute right-3 top-2 text-2xl text-[#475569]" aria-label="Close" @click="open = false">×</button>
            <iframe :src="props.modalUrl" width="100%" height="180" style="border:1px solid #d2d7dc; background:#fff" frameborder="0" scrolling="no" />
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </section>
</template>

