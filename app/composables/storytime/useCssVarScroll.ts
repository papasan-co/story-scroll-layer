import { onMounted, onBeforeUnmount, type Ref } from 'vue'

type RootTarget = string | Ref<HTMLElement | null>

export function useCssVarScroll(root: RootTarget = '#scrolly') {
  let raf = 0
  // Viewport height is CACHED, not read per frame. window.innerHeight
  // tracks the dynamic viewport, so reading it live made these CSS vars
  // (and anything derived from them) snap ~10% every time the mobile
  // URL bar toggled mid-scroll. Refreshed only on width-changing
  // resizes — rotation or a real window resize — never the URL bar.
  let cachedVh = 1
  let cachedW = 0
  const measureViewport = () => {
    cachedVh = Math.max(1, window.innerHeight)
    cachedW = window.innerWidth
  }
  const setVar = (el: HTMLElement, name: string, val: string) => el.style.setProperty(name, val)
  const isPinchZooming = () =>
    typeof window !== 'undefined'
    && window.visualViewport != null
    && window.visualViewport.scale > 1.01

  const resolveRoot = (): HTMLElement | null => {
    if (typeof root === 'string') {
      return document.querySelector<HTMLElement>(root)
    }
    return root.value
  }

  const onScroll = () => {
    if (isPinchZooming()) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      if (isPinchZooming()) return
      const el = resolveRoot()
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = cachedVh
      const topFrac = Math.max(0, Math.min(1, 1 - r.top / vh))
      const botFrac = Math.max(0, Math.min(1, (vh - r.bottom) / vh))
      setVar(el, '--g-top-offset-fraction', String(topFrac))
      setVar(el, '--g-bottom-offset-fraction', String(botFrac))

      // Parabola: 0 at edges, peaks near middle. Then give it a sign using (topFrac - 0.5).
      // This prevents the initial shift at page top.
      const desktop = window.innerWidth >= 1024
      const amp = desktop ? 60 : 0 // px; disable on mobile
      const weight = 4 * topFrac * (1 - topFrac) // 0 at 0/1, 1 at 0.5
      const signed = (topFrac - 0.5) * weight // signed & fades at edges
      const offset = Math.round(signed * amp)
      setVar(el, '--parallax-offset', `${offset}px`)
    })
  }

  const onResize = () => {
    if (window.innerWidth === cachedW) return
    measureViewport()
    onScroll()
  }

  onMounted(() => {
    measureViewport()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onResize)
    onScroll()
  })
  onBeforeUnmount(() => {
    removeEventListener('scroll', onScroll)
    removeEventListener('resize', onResize)
    cancelAnimationFrame(raf)
  })
}
