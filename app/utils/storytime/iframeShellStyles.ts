/**
 * Structural styles required when StoryScrollyPage renders in an isolated
 * iframe. They are deliberately separate from the host application's CSS so
 * a preview has the same layout in development and production.
 */
export const storytimeIframeShellStylesheets = Object.freeze([
  new URL('../../assets/css/storytime.css', import.meta.url).href,
])
