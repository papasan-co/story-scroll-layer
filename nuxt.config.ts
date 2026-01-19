import { fileURLToPath } from 'node:url'

/**
 * storytime-layer
 *
 * Shared scrolly-story engine + primitives (no partner-specific visuals).
 * Consumers (cms-frontend + cms-story-components playground) provide visuals via pods runtime.
 */
export default defineNuxtConfig({
  $meta: {
    name: 'storytime-layer',
  },
  
  css: [fileURLToPath(new URL('./app/assets/css/storytime.css', import.meta.url))],
  
  components: {
    dirs: [
      { path: fileURLToPath(new URL('./app/components', import.meta.url)), pathPrefix: false },
      { path: fileURLToPath(new URL('./app/components/storytime', import.meta.url)), pathPrefix: false },
      { path: fileURLToPath(new URL('./app/components/storytime/blocks', import.meta.url)), pathPrefix: false },
      { path: fileURLToPath(new URL('./app/components/storytime/controls', import.meta.url)), pathPrefix: false },
    ],
  },
})

