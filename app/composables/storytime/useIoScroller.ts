import { ref, onMounted, onBeforeUnmount, nextTick, type Ref } from 'vue'
import type {
  FlatStoryStep,
  StoryActivationMode,
  StoryScene,
  StoryScrollTarget,
} from '../../types/storytime/scenes'

const LG_BREAKPOINT = 1024

export function isStepHiddenForViewport(el: HTMLElement, isDesktop = window.innerWidth > LG_BREAKPOINT): boolean {
  if (isDesktop && el.dataset.mobileOnly === 'true') return true
  if (!isDesktop && el.dataset.desktopOnly === 'true') return true

  return el.offsetParent === null
}

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
   * Optional scroll container for panel-scroll mode.
   * When provided, desktop activation + snapping are computed relative to this element.
   */
  scrollRoot?: Ref<HTMLElement | null> | null
  /**
   * Disable desktop snap-to-step behavior (useful for panel-scroll/editor mode).
   */
  disableSnap?: Ref<boolean> | boolean
  /**
   * CSS selector for step elements.
   */
  stepSelector?: string
  /**
   * Mobile-only heuristic: how far above top previous card must be before activating next.
   */
  mobilePrevExitPx?: number
  /**
   * Treat desktop as a viewport-card stack for stories that intentionally use
   * mobile-style scroll runway on every viewport.
   */
  forceMobileSpacing?: Ref<boolean> | boolean
  /**
   * Target used by programmatic jumps and optional snapping.
   * `card` matches coded-story reels where the narrative card is the scroll anchor.
   */
  scrollTarget?: Ref<StoryScrollTarget> | StoryScrollTarget
  /**
   * Activation heuristic. `card-center` matches source reels whose active step is
   * driven by the narrative card crossing a viewport anchor.
   */
  activationMode?: Ref<StoryActivationMode> | StoryActivationMode
  activationAnchor?: Ref<number> | number
  activationHysteresisPx?: Ref<number> | number
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
  let rafDesktop = 0
  let lastScrollDrivenChange = 0
  let programmaticStepIndex: number | null = null
  let programmaticScrollUntil = 0
  let desktopScrollRoot: HTMLElement | Window | null = null
  let resizeHandler: (() => void) | null = null
  const SCROLL_DRIVEN_LOCK_MS = 200
  const MOBILE_PREV_EXIT_PX = typeof options.mobilePrevExitPx === 'number'
    ? options.mobilePrevExitPx
    : 100
  const PINCH_ZOOM_SCALE_THRESHOLD = 1.01
  const RESIZE_LOCK_MS = 700
  const RESIZE_WIDTH_DELTA = 40
  const RESIZE_HEIGHT_DELTA = 120
  let resizeLockUntil = 0
  let lastSeenInnerWidth = typeof window !== 'undefined' ? window.innerWidth : 0
  let lastSeenInnerHeight = typeof window !== 'undefined' ? window.innerHeight : 0

  const isPinchZooming = () =>
    typeof window !== 'undefined'
    && window.visualViewport != null
    && window.visualViewport.scale > PINCH_ZOOM_SCALE_THRESHOLD
  const isResizeLocked = () => Date.now() < resizeLockUntil
  const maybeLockOnResize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    const widthDelta = Math.abs(width - lastSeenInnerWidth)
    const heightDelta = Math.abs(height - lastSeenInnerHeight)

    if (widthDelta >= RESIZE_WIDTH_DELTA || heightDelta >= RESIZE_HEIGHT_DELTA) {
      resizeLockUntil = Date.now() + RESIZE_LOCK_MS
    }

    lastSeenInnerWidth = width
    lastSeenInnerHeight = height
  }

  const getSteps = (): HTMLElement[] => {
    const selector = options.stepSelector ?? '.step'
    const root = options.stepsRoot?.value ?? null
    const list = root
      ? root.querySelectorAll<HTMLElement>(selector)
      : document.querySelectorAll<HTMLElement>(selector)
    return Array.from(list)
  }

  const refreshSteps = () => {
    stepsEls = getSteps()
    return stepsEls
  }

  const isDesktopViewport = () => window.innerWidth > LG_BREAKPOINT
  const forceMobileSpacing = () => {
    const value = options.forceMobileSpacing
    if (typeof value === 'boolean') return value
    return Boolean(value && 'value' in value && value.value)
  }
  const scrollTarget = (): StoryScrollTarget => {
    const value = options.scrollTarget
    const resolved = typeof value === 'string'
      ? value
      : value && 'value' in value
        ? value.value
        : undefined
    return resolved === 'card' ? 'card' : 'step'
  }
  const activationMode = (): StoryActivationMode => {
    const value = options.activationMode
    const resolved = typeof value === 'string'
      ? value
      : value && 'value' in value
        ? value.value
        : undefined
    return resolved === 'card-center' ? 'card-center' : 'step-exit'
  }
  const activationAnchor = () => {
    const value = options.activationAnchor
    const resolved = typeof value === 'number'
      ? value
      : value && 'value' in value
        ? value.value
        : undefined
    return typeof resolved === 'number' && Number.isFinite(resolved)
      ? Math.max(0, Math.min(1, resolved))
      : 0.7
  }
  const activationHysteresisPx = () => {
    const value = options.activationHysteresisPx
    const resolved = typeof value === 'number'
      ? value
      : value && 'value' in value
        ? value.value
        : undefined
    return typeof resolved === 'number' && Number.isFinite(resolved)
      ? Math.max(0, resolved)
      : 24
  }
  const isMobileSpacingMode = () => window.innerWidth < LG_BREAKPOINT || forceMobileSpacing()

  const rootElement = () => options.scrollRoot && 'value' in options.scrollRoot
    ? options.scrollRoot.value
    : null

  const stepScrollElement = (stepEl: HTMLElement, target: StoryScrollTarget = scrollTarget()) => {
    if (target !== 'card') return stepEl
    return stepEl.querySelector<HTMLElement>('[data-article-card]') || stepEl
  }

  const visibleStepIndexes = () => {
    const isDesktop = isDesktopViewport()
    const steps = refreshSteps()

    return steps.reduce<number[]>((indexes, el, index) => {
      if (!isStepHiddenForViewport(el, isDesktop)) indexes.push(index)
      return indexes
    }, [])
  }

  const findVisibleStepIndex = (startIndex: number, delta: number) => {
    const steps = refreshSteps()
    if (!steps.length) return null
    const direction = delta < 0 ? -1 : 1
    let index = Math.min(steps.length - 1, Math.max(0, startIndex))

    while (index >= 0 && index < steps.length) {
      const el = steps[index]
      if (el && !isStepHiddenForViewport(el, isDesktopViewport())) return index
      index += direction
    }

    return null
  }

  const getStepTargetIndex = (fromIndex = activeStep.value, delta = 1) => {
    const direction = delta < 0 ? -1 : 1
    return findVisibleStepIndex(fromIndex + direction, direction)
  }

  const resolveVisibleStepIndex = (index: number, direction = 1) => {
    return findVisibleStepIndex(index, direction)
  }

  const activateStep = (index: number) => {
    const stepData = flatSteps[index]
    if (!stepData) return

    if (activeStep.value !== index) {
      activeStep.value = index
    }

    nextTick(() => {
      const { sceneIdx, localStep } = stepData
      const scene = scenes[sceneIdx]
      ;(scene as any)?.visual?.onEnter?.({ step: localStep, ref: visualRefs[scene.key] })
    })
  }

  const scrollToStepIndex = (
    index: number,
    behavior: ScrollBehavior = 'smooth',
    direction = index < activeStep.value ? -1 : 1,
    align: 'center' | 'start' = 'center',
    targetElement: StoryScrollTarget = scrollTarget(),
  ) => {
    const target = findVisibleStepIndex(index, direction)
    if (target === null) return false

    refreshSteps()
    const el = stepsEls[target]
    if (!el) return false

    programmaticStepIndex = target
    programmaticScrollUntil = Date.now() + 900

    const scrollEl = stepScrollElement(el, targetElement)
    const r = scrollEl.getBoundingClientRect()
    const shouldPeekCardFromBottom =
      align === 'center' &&
      targetElement === 'card' &&
      window.matchMedia('(max-width: 1024px)').matches
    const rootEl = rootElement()
    if (rootEl) {
      const rootRect = rootEl.getBoundingClientRect()
      const offsetTop = r.top - rootRect.top
      const nextTop = align === 'start'
        ? rootEl.scrollTop + offsetTop
        : shouldPeekCardFromBottom
        ? rootEl.scrollTop + offsetTop - rootEl.clientHeight * 0.85
        : rootEl.scrollTop + offsetTop - (rootEl.clientHeight / 2 - r.height / 2)
      rootEl.scrollTo({ top: nextTop, behavior })
    } else {
      if (align === 'start' && targetElement === 'step') {
        el.scrollIntoView({
          block: 'start',
          inline: 'nearest',
          behavior,
        })
      } else {
        const targetY = align === 'start'
          ? window.scrollY + r.top
          : shouldPeekCardFromBottom
          ? window.scrollY + r.top - window.innerHeight * 0.85
          : window.scrollY + r.top - (window.innerHeight / 2 - r.height / 2)
        window.scrollTo({ top: targetY, behavior })
      }
    }

    activateStep(target)
    window.setTimeout(() => {
      if (programmaticStepIndex !== target) return
      activateStep(target)
      programmaticStepIndex = null
      programmaticScrollUntil = 0
    }, 950)

    return true
  }

  function snapToStep(el: HTMLElement) {
    if (programmaticStepIndex !== null && Date.now() < programmaticScrollUntil) {
      return
    }

    const scrollEl = stepScrollElement(el)
    const r = scrollEl.getBoundingClientRect()
    const rootEl = rootElement()
    if (rootEl) {
      const rootRect = rootEl.getBoundingClientRect()
      const current = rootEl.scrollTop
      const offsetTop = r.top - rootRect.top
      const target = current + offsetTop - (rootEl.clientHeight / 2 - r.height / 2)
      if (Math.abs(rootEl.scrollTop - target) > 2) {
        rootEl.scrollTo({ top: target, behavior: 'smooth' })
      }
      return
    }

    const targetY = window.scrollY + r.top - (window.innerHeight / 2 - r.height / 2)
    if (Math.abs(window.scrollY - targetY) > 2) window.scrollTo({ top: targetY, behavior: 'smooth' })
  }
  const snapThrottled = throttle(snapToStep, 500)

  const handleResize = () => {
    const isMobile = isMobileSpacingMode()
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
    if (!isMobileSpacingMode()) return
    if (isPinchZooming()) return
    if (isResizeLocked()) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      if (isPinchZooming()) return
      if (isResizeLocked()) return
      if (activationMode() === 'card-center') {
        activateClosestCardCenteredStep()
        return
      }

      if (!stepsEls.length) return
      const visibleIndexes = visibleStepIndexes()
      let index = visibleIndexes[0] ?? 0

      for (let i = 1; i < visibleIndexes.length; i++) {
        const previousIndex = visibleIndexes[i - 1]
        const currentIndex = visibleIndexes[i]
        const prev = stepsEls[previousIndex]
        const prevCard = prev.querySelector<HTMLElement>('[data-article-card]') || prev
        const prevBottom = prevCard.getBoundingClientRect().bottom

        if (prevBottom <= -MOBILE_PREV_EXIT_PX) {
          index = currentIndex
        } else {
          break
        }
      }

      if (index !== activeStep.value) {
        activateStep(index)
      }
    })
  }

  const activateClosestCardCenteredStep = () => {
    if (!stepsEls.length) return
    if (programmaticStepIndex !== null && Date.now() < programmaticScrollUntil) return
    if (isPinchZooming()) return
    if (isResizeLocked()) return

    const rootEl = rootElement()
    const rootRect = rootEl?.getBoundingClientRect()
    const viewportHeight = rootEl?.clientHeight || window.innerHeight
    let bestIdx = -1
    let bestDist = Number.POSITIVE_INFINITY

    const indexes = visibleStepIndexes()
    for (const index of indexes) {
      const stepEl = stepsEls[index]
      const card = stepEl ? stepScrollElement(stepEl, 'card') : null
      if (!card) continue

      const r = card.getBoundingClientRect()
      const top = rootRect ? r.top - rootRect.top : r.top
      const bottom = rootRect ? r.bottom - rootRect.top : r.bottom
      if (bottom < -viewportHeight || top > viewportHeight * 2) continue

      const articleTrigger = (flatSteps[index]?.article as any)?.triggerCenterFraction
      const desiredFraction = typeof articleTrigger === 'number'
        ? Math.max(0, Math.min(1, articleTrigger))
        : activationAnchor()
      const desiredY = viewportHeight * desiredFraction
      const center = top + r.height / 2
      const dist = Math.abs(center - desiredY)

      if (dist < bestDist) {
        bestDist = dist
        bestIdx = index
      }
    }

    if (bestIdx === -1 || bestIdx === activeStep.value) return

    const currentEl = stepsEls[activeStep.value]
    const currentCard = currentEl ? stepScrollElement(currentEl, 'card') : null
    if (currentCard) {
      const currentRect = currentCard.getBoundingClientRect()
      const currentTop = rootRect ? currentRect.top - rootRect.top : currentRect.top
      const currentTrigger = (flatSteps[activeStep.value]?.article as any)?.triggerCenterFraction
      const currentDesiredFraction = typeof currentTrigger === 'number'
        ? Math.max(0, Math.min(1, currentTrigger))
        : activationAnchor()
      const currentDesiredY = viewportHeight * currentDesiredFraction
      const currentCenter = currentTop + currentRect.height / 2
      const currentDist = Math.abs(currentCenter - currentDesiredY)
      if (currentDist - bestDist <= activationHysteresisPx()) return
    }

    lastScrollDrivenChange = Date.now()
    activateStep(bestIdx)
  }

  const onScrollDesktop = () => {
    if (!isDesktopViewport()) return
    if (programmaticStepIndex !== null && Date.now() < programmaticScrollUntil) return
    if (isPinchZooming()) return
    if (isResizeLocked()) return

    cancelAnimationFrame(rafDesktop)
    rafDesktop = requestAnimationFrame(() => {
      if (isPinchZooming()) return
      if (isResizeLocked()) return
      activateClosestCardCenteredStep()
    })
  }

  function handleMediaChange(e: MediaQueryListEvent | MediaQueryList) {
    snapAllowed.value = (e as MediaQueryList).matches && !forceMobileSpacing()
  }

  onMounted(() => {
    mq = window.matchMedia(`(min-width:${LG_BREAKPOINT}px)`)
    handleMediaChange(mq)
    mq.addEventListener('change', handleMediaChange)

    nextTick(() => {
      stepsEls = getSteps()

      const isMobile = isMobileSpacingMode()
      if (!isMobile) {
        const rootEl = options.scrollRoot && 'value' in options.scrollRoot ? options.scrollRoot.value : null
        const disableSnap =
          typeof options.disableSnap === 'boolean'
            ? options.disableSnap
            : options.disableSnap && 'value' in options.disableSnap
              ? options.disableSnap.value
              : false

        io = new IntersectionObserver(
          (entries) => {
            if (programmaticStepIndex !== null && Date.now() < programmaticScrollUntil) {
              activateStep(programmaticStepIndex)
              return
            }
            if (Date.now() - lastScrollDrivenChange < SCROLL_DRIVEN_LOCK_MS) return
            if (isPinchZooming()) return
            if (isResizeLocked()) return
            if (activationMode() === 'card-center') {
              activateClosestCardCenteredStep()
              return
            }

            let bestIndex = -1
            let bestDistance = Number.POSITIVE_INFINITY

            entries.forEach((e) => {
              if (!e.isIntersecting) return
              const index = stepsEls.indexOf(e.target as HTMLElement)
              if (index === -1) return
              if (isStepHiddenForViewport(e.target as HTMLElement, true)) return

              const rect = (e.target as HTMLElement).getBoundingClientRect()
              const center = rect.top + rect.height / 2
              const desiredFraction = Math.max(0.0, Math.min(1.0, (flatSteps[index]?.article as any)?.triggerCenterFraction ?? 0.7))
              const desiredY = window.innerHeight * desiredFraction
              const distance = Math.abs(center - desiredY)
              if (distance < bestDistance) {
                bestDistance = distance
                bestIndex = index
              }
            })

            if (bestIndex !== -1) {
              if (snapAllowed.value && !disableSnap) snapThrottled(stepsEls[bestIndex] as HTMLElement)
              activateStep(bestIndex)
            }
          },
          {
            root: rootEl,
            rootMargin: '0px 0px -40% 0px',
            threshold: 0.4,
          }
        )

        stepsEls.forEach((el) => io!.observe(el))
        desktopScrollRoot = rootEl || window
        if (activationMode() === 'card-center') {
          desktopScrollRoot.addEventListener('scroll', onScrollDesktop, { passive: true })
          onScrollDesktop()
        }
      } else {
        addEventListener('scroll', onScrollMobile, { passive: true })
        onScrollMobile()
      }

      handleResize()
      lastSeenInnerWidth = window.innerWidth
      lastSeenInnerHeight = window.innerHeight
      resizeHandler = () => {
        maybeLockOnResize()
        handleResize()
      }
      window.addEventListener('resize', resizeHandler)

      stepsReady.value = true
    })
  })

  onBeforeUnmount(() => {
    if (resizeHandler) window.removeEventListener('resize', resizeHandler)
    mq?.removeEventListener('change', handleMediaChange)
    io?.disconnect()
    removeEventListener('scroll', onScrollMobile)
    desktopScrollRoot?.removeEventListener('scroll', onScrollDesktop)
    cancelAnimationFrame(rafDesktop)
    snapThrottled as any
  })

  return { activeStep, stepsReady, getStepTargetIndex, resolveVisibleStepIndex, scrollToStepIndex }
}
