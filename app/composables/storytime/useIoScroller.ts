import { ref, onMounted, onBeforeUnmount, nextTick, type Ref } from 'vue'
import type { FlatStoryStep, StoryScene } from '../../types/storytime/scenes'

const LG_BREAKPOINT = 1024

// tiny inline throttle so we can drop lodash-es
function throttle<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let last = 0, scheduled = 0, ctx: any, args: any[]
  const run = () => { last = Date.now(); scheduled = 0; fn.apply(ctx, args) }
  return function (this: any, ...a: any[]) {
    ctx = this; args = a
    const now = Date.now()
    const remaining = wait - (now - last)
    if (remaining <= 0) run()
    else if (!scheduled) scheduled = window.setTimeout(run, remaining)
  } as T
}

export interface UseIoScrollerOptions {
  /**
   * Root element used to query `.step` elements.
   * If omitted, falls back to document.
   */
  stepsRoot?: Ref<HTMLElement | null>
  /**
   * CSS selector for step elements.
   */
  stepSelector?: string
  /**
   * Mobile-only heuristic: how far above top previous card must be before activating next.
   */
  mobilePrevExitPx?: number
}

export function useIoScroller(
  flatSteps: FlatStoryStep[],
  scenes: StoryScene[],
  visualRefs: Record<string, any>,
  options: UseIoScrollerOptions = {}
) {
  const activeStep = ref(0)
  const stepsReady = ref(false)
  const snapAllowed = ref(true)

  let mq: MediaQueryList | null = null
  let io: IntersectionObserver | null = null
  let stepsEls: HTMLElement[] = []
  let raf = 0
  const MOBILE_PREV_EXIT_PX = typeof options.mobilePrevExitPx === 'number'
    ? options.mobilePrevExitPx
    : 100

  const getSteps = (): HTMLElement[] => {
    const selector = options.stepSelector ?? '.step'
    const root = options.stepsRoot?.value ?? null
    const list = root
      ? root.querySelectorAll<HTMLElement>(selector)
      : document.querySelectorAll<HTMLElement>(selector)
    return Array.from(list)
  }

  function snapToStep(el: HTMLElement) {
    const r = el.getBoundingClientRect()
    const targetY = window.scrollY + r.top - (window.innerHeight / 2 - r.height / 2)
    if (Math.abs(window.scrollY - targetY) > 2) {
      window.scrollTo({ top: targetY, behavior: 'smooth' })
    }
  }
  const snapThrottled = throttle(snapToStep, 500)

  const handleResize = () => {
    const isMobile = window.innerWidth < LG_BREAKPOINT
    const steps = getSteps()

    // Always clear inline minHeight on desktop; Tailwind handles it
    if (!isMobile) {
      steps.forEach(el => (el.style.minHeight = ''))
      return
    }

    const supportsSVH = CSS.supports('height', '100svh')
    const computeOffsets = (idx: number) => {
      const fs = flatSteps[idx]
      const article = fs?.article || {}
      const scene = scenes[fs?.sceneIdx]
      const isFirst = fs?.localStep === 0
      const isLast = fs && scenes[fs.sceneIdx]?.articles
        ? (fs.localStep === scenes[fs.sceneIdx].articles.length - 1)
        : false
      const isGlobalLast = idx === flatSteps.length - 1

      const DEFAULT_GAP_DVH = 150
      const DEFAULT_TAIL_DVH = 30
      const sceneGap = typeof scene?.mobileCardGapDvh === 'number' && isFinite(scene.mobileCardGapDvh)
        ? scene.mobileCardGapDvh
        : DEFAULT_GAP_DVH
      const sceneMin = scene?.mobileMinHeightDvh

      let topDvh = (article as any).mobileTopOffsetDvh
      let bottomDvh = (article as any).mobileBottomOffsetDvh

      if (isFirst && typeof topDvh !== 'number') topDvh = scene?.mobileLeadInDvh
      if (isLast && typeof bottomDvh !== 'number') bottomDvh = scene?.mobileLeadOutDvh

      if (typeof topDvh !== 'number') {
        const prev = flatSteps[idx - 1]?.article || {}
        const prevBottom = typeof (prev as any).mobileBottomOffsetDvh === 'number' && isFinite((prev as any).mobileBottomOffsetDvh)
          ? (prev as any).mobileBottomOffsetDvh
          : 0
        const neededTop = sceneGap - prevBottom
        topDvh = Math.max(0, neededTop)
      }

      if (isGlobalLast && typeof bottomDvh !== 'number') {
        bottomDvh = DEFAULT_TAIL_DVH
      }

      if (typeof topDvh !== 'number') topDvh = 0
      if (typeof bottomDvh !== 'number') bottomDvh = 0

      const minHeightDvh = (article as any).mobileMinHeightDvh ?? sceneMin

      return { topDvh, bottomDvh, minHeightDvh }
    }

    if (supportsSVH) {
      steps.forEach((el, idx) => {
        el.style.minHeight = ''
        const { topDvh, bottomDvh } = computeOffsets(idx)
        const card = el.querySelector<HTMLElement>('[data-article-card]') || el
        card.style.marginTop = typeof topDvh === 'number' && isFinite(topDvh) ? `${topDvh}svh` : ''
        card.style.marginBottom = typeof bottomDvh === 'number' && isFinite(bottomDvh) ? `${bottomDvh}svh` : ''
      })
      return
    }

    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--mobile-step-height')
      .trim() || '100vh'

    let px = 0
    if (raw.endsWith('dvh') || raw.endsWith('vh')) {
      const n = parseFloat(raw)
      px = Math.round((window.innerHeight * n) / 100)
    } else if (raw.endsWith('px')) {
      px = Math.round(parseFloat(raw))
    } else {
      const n = parseFloat(raw)
      px = Math.round((window.innerHeight * (isFinite(n) ? n : 100)) / 100)
    }

    steps.forEach((el, idx) => {
      const { topDvh, bottomDvh, minHeightDvh } = computeOffsets(idx)

      const targetMinPx = typeof minHeightDvh === 'number' && isFinite(minHeightDvh)
        ? Math.round((window.innerHeight * minHeightDvh) / 100)
        : px

      const content = el.scrollHeight + 32
      el.style.minHeight = `${Math.max(targetMinPx, content)}px`

      const card = el.querySelector<HTMLElement>('[data-article-card]') || el
      card.style.marginTop = typeof topDvh === 'number' && isFinite(topDvh)
        ? `${Math.round((window.innerHeight * topDvh) / 100)}px`
        : ''
      card.style.marginBottom = typeof bottomDvh === 'number' && isFinite(bottomDvh)
        ? `${Math.round((window.innerHeight * bottomDvh) / 100)}px`
        : ''
    })
  }

  // Mobile-only: activate step i when previous card bottom is at least MOBILE_PREV_EXIT_PX above top
  const onScrollMobile = () => {
    if (window.innerWidth >= LG_BREAKPOINT) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      if (!stepsEls.length) return
      let index = 0
      for (let i = 1; i < stepsEls.length; i++) {
        const prev = stepsEls[i - 1]
        const prevCard = prev.querySelector<HTMLElement>('[data-article-card]') || prev
        const prevBottom = prevCard.getBoundingClientRect().bottom

        if (prevBottom <= -MOBILE_PREV_EXIT_PX) {
          index = i
        } else {
          break
        }
      }

      if (index !== activeStep.value) {
        activeStep.value = index
        nextTick(() => {
          const { sceneIdx, localStep } = flatSteps[index]
          const scene = scenes[sceneIdx]
          // Prefer visuals reacting to `step` prop; onEnter is optional.
          ;(scene as any)?.visual?.onEnter?.({ step: localStep, ref: visualRefs[scene.key] })
        })
      }
    })
  }

  function handleMediaChange(e: MediaQueryListEvent | MediaQueryList) {
    snapAllowed.value = (e as MediaQueryList).matches
  }

  onMounted(() => {
    mq = window.matchMedia(`(min-width:${LG_BREAKPOINT}px)`)
    handleMediaChange(mq)
    mq.addEventListener('change', handleMediaChange)

    nextTick(() => {
      stepsEls = getSteps()

      const isMobile = window.innerWidth < LG_BREAKPOINT
      if (!isMobile) {
        io = new IntersectionObserver(
          (entries) => {
            let bestIndex = -1
            let bestDistance = Number.POSITIVE_INFINITY

            entries.forEach((e) => {
              if (!e.isIntersecting) return
              const index = stepsEls.indexOf(e.target as HTMLElement)
              if (index === -1) return

              const rect = (e.target as HTMLElement).getBoundingClientRect()
              const center = rect.top + rect.height / 2
              const desiredFraction = Math.max(0.0, Math.min(1.0, (flatSteps[index]?.article as any)?.triggerCenterFraction ?? 0.5))
              const desiredY = window.innerHeight * desiredFraction
              const distance = Math.abs(center - desiredY)
              if (distance < bestDistance) {
                bestDistance = distance
                bestIndex = index
              }
            })

            if (bestIndex !== -1) {
              activeStep.value = bestIndex
              if (snapAllowed.value) snapThrottled(stepsEls[bestIndex] as HTMLElement)

              nextTick(() => {
                const { sceneIdx, localStep } = flatSteps[bestIndex]
                const scene = scenes[sceneIdx]
                ;(scene as any)?.visual?.onEnter?.({ step: localStep, ref: visualRefs[scene.key] })
              })
            }
          },
          {
            root: null,
            rootMargin: '0px 0px -40% 0px',
            threshold: 0.4,
          }
        )

        stepsEls.forEach((el) => io!.observe(el))
      } else {
        addEventListener('scroll', onScrollMobile, { passive: true })
        onScrollMobile()
      }

      handleResize()
      window.addEventListener('resize', handleResize)

      stepsReady.value = true
    })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    mq?.removeEventListener('change', handleMediaChange)
    io?.disconnect()
    removeEventListener('scroll', onScrollMobile)
    snapThrottled as any
  })

  return { activeStep, stepsReady }
}

