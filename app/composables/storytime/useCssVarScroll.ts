import { onMounted, onBeforeUnmount, type Ref } from 'vue'

type RootTarget = string | Ref<HTMLElement | null>

export function useCssVarScroll(root: RootTarget = '#scrolly') {
  let raf = 0
  const setVar = (el: HTMLElement, name: string, val: string) => el.style.setProperty(name, val)

  const resolveRoot = (): HTMLElement | null => {
    if (typeof root === 'string') {
      return document.querySelector<HTMLElement>(root)
    }
    return root.value
  }

  const onScroll = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const el = resolveRoot()
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = Math.max(1, window.innerHeight)
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

  onMounted(() => {
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  })
  onBeforeUnmount(() => {
    removeEventListener('scroll', onScroll)
    cancelAnimationFrame(raf)
  })
}

