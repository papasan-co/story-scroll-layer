import type {
  StoryMotionBinding,
  StorySceneMotionPresentation,
} from '../../types/storytime/scenes'
import {
  MOTION_CAPABILITIES,
  MOTION_CAPABILITY_REGISTRY_HASH,
  MOTION_CAPABILITY_REGISTRY_VERSION,
} from '../../types/storytime/motionCapabilities.generated'

export type StoryMotionDiagnostic = {
  pointer: string
  code: 'registry_mismatch' | 'unapproved_capability' | 'missing_target' | 'duplicate_target'
  message: string
}

export type StoryMotionRuntimeState = {
  active: boolean
  progress: number
}

export type StoryMotionController = {
  update: (state: StoryMotionRuntimeState) => void
  destroy: () => void
}

type BoundMotion = {
  binding: StoryMotionBinding
  target: HTMLElement
  index: number
  animation: Animation | null
  frame: number | null
  entered: boolean
  original: {
    capability: string | null
    state: string | null
    reduced: string | null
    opacity: string
    transform: string
    translate: string
    clipPath: string
    text: string | null
  }
}

export type StoryMotionControllerOptions = {
  root: ParentNode
  sceneKey: string
  presentation: StorySceneMotionPresentation
  reducedMotion?: boolean
  now?: () => number
  requestFrame?: (callback: FrameRequestCallback) => number
  cancelFrame?: (handle: number) => void
}

const approvedStorytimeCapabilities = new Set(
  MOTION_CAPABILITIES
    .filter(capability => capability.executor === 'storytime')
    .map(capability => capability.id),
)

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function motionTargetsForScene(root: ParentNode, sceneKey: string) {
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-au-motion-key]'))

  return targets.filter((target) => {
    const scope = target.closest<HTMLElement>('[data-scene-key]')
    return scope?.getAttribute('data-scene-key') === sceneKey
  })
}

export function validateSceneMotionTargets(
  root: ParentNode,
  sceneKey: string,
  presentation: StorySceneMotionPresentation,
): StoryMotionDiagnostic[] {
  const diagnostics: StoryMotionDiagnostic[] = []

  if (
    presentation.registryVersion !== MOTION_CAPABILITY_REGISTRY_VERSION
    || presentation.registryHash !== MOTION_CAPABILITY_REGISTRY_HASH
  ) {
    diagnostics.push({
      pointer: '/motion/registryHash',
      code: 'registry_mismatch',
      message: 'The scene motion registry identity does not match this Storytime runtime.',
    })
  }

  const targetsByKey = new Map<string, HTMLElement[]>()
  for (const target of motionTargetsForScene(root, sceneKey)) {
    const key = target.getAttribute('data-au-motion-key') || ''
    const targets = targetsByKey.get(key) || []
    targets.push(target)
    targetsByKey.set(key, targets)
  }

  for (const [index, binding] of presentation.bindings.entries()) {
    if (!approvedStorytimeCapabilities.has(binding.capabilityId)) {
      diagnostics.push({
        pointer: `/motion/bindings/${index}/capabilityId`,
        code: 'unapproved_capability',
        message: `Capability ${binding.capabilityId} is not approved for the Storytime executor.`,
      })
    }

    const targets = targetsByKey.get(binding.targetKey) || []
    if (targets.length === 0) {
      diagnostics.push({
        pointer: `/motion/bindings/${index}/targetKey`,
        code: 'missing_target',
        message: `Motion target ${binding.targetKey} is absent from scene ${sceneKey}.`,
      })
    } else if (targets.length > 1) {
      diagnostics.push({
        pointer: `/motion/bindings/${index}/targetKey`,
        code: 'duplicate_target',
        message: `Motion target ${binding.targetKey} occurs ${targets.length} times in scene ${sceneKey}.`,
      })
    }
  }

  return diagnostics
}

export class StoryMotionBindingError extends Error {
  constructor(public readonly diagnostics: StoryMotionDiagnostic[]) {
    super(diagnostics.map(diagnostic => `${diagnostic.pointer}: ${diagnostic.message}`).join('\n'))
    this.name = 'StoryMotionBindingError'
  }
}

function originalAttribute(target: HTMLElement, name: string) {
  return target.hasAttribute(name) ? target.getAttribute(name) : null
}

function setOrRemoveAttribute(target: HTMLElement, name: string, value: string | null) {
  if (value === null) {
    target.removeAttribute(name)
  } else {
    target.setAttribute(name, value)
  }
}

function defaultReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function defaultRequestFrame(callback: FrameRequestCallback) {
  return window.requestAnimationFrame(callback)
}

function defaultCancelFrame(handle: number) {
  window.cancelAnimationFrame(handle)
}

function animateTarget(
  bound: BoundMotion,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) {
  bound.animation?.cancel()

  if (typeof bound.target.animate !== 'function') {
    bound.target.setAttribute('data-au-motion-state', 'settled')
    return
  }

  bound.target.setAttribute('data-au-motion-state', 'entering')
  bound.animation = bound.target.animate(keyframes, options)
  bound.animation.addEventListener?.('finish', () => {
    bound.target.setAttribute('data-au-motion-state', 'settled')
  }, { once: true })
}

function revealOnEnter(bound: BoundMotion, reducedMotion: boolean) {
  const parameters = bound.binding.capabilityId === 'story-reveal-on-enter.v1'
    ? bound.binding.parameters
    : null
  if (!parameters) return

  const axis = parameters.axis ?? 'y'
  const distance = parameters.distancePx ?? 24
  const transform = axis === 'none'
    ? 'none'
    : `translate${axis.toUpperCase()}(${distance}px)`

  bound.target.style.opacity = '1'
  bound.target.style.transform = 'none'
  if (reducedMotion) {
    bound.target.setAttribute('data-au-motion-state', 'settled')
    return
  }

  animateTarget(
    bound,
    [
      { opacity: 0, transform },
      { opacity: 1, transform: 'none' },
    ],
    {
      duration: parameters.durationMs ?? 480,
      delay: (parameters.delayMs ?? 0) + (parameters.staggerMs ?? 0) * bound.index,
      easing: parameters.easing ?? 'ease-out',
      fill: 'both',
    },
  )
}

function scrollProgressTransform(bound: BoundMotion, progress: number, reducedMotion: boolean) {
  if (bound.binding.capabilityId !== 'story-scroll-progress-transform.v1') return
  const parameters = bound.binding.parameters
  const normalizedProgress = reducedMotion ? 1 : clamp01(progress)
  const value = parameters.from + (parameters.to - parameters.from) * normalizedProgress
  const unit = parameters.unit === 'percent' ? '%' : 'px'

  bound.target.style.translate = parameters.axis === 'x'
    ? `${value}${unit} 0`
    : `0 ${value}${unit}`

  if (parameters.opacityFrom !== undefined && parameters.opacityTo !== undefined) {
    const opacity = parameters.opacityFrom
      + (parameters.opacityTo - parameters.opacityFrom) * normalizedProgress
    bound.target.style.opacity = String(opacity)
  }
  bound.target.setAttribute('data-au-motion-state', normalizedProgress >= 1 ? 'settled' : 'active')
}

function countUpOnEnter(
  bound: BoundMotion,
  reducedMotion: boolean,
  now: () => number,
  requestFrame: (callback: FrameRequestCallback) => number,
) {
  if (bound.binding.capabilityId !== 'story-count-up-on-enter.v1') return
  const parameters = bound.binding.parameters
  const format = (value: number) => [
    parameters.prefix ?? '',
    value.toFixed(parameters.decimals ?? 0),
    parameters.suffix ?? '',
  ].join('')

  if (reducedMotion || (parameters.durationMs ?? 900) === 0) {
    bound.target.textContent = format(parameters.to)
    bound.target.setAttribute('data-au-motion-state', 'settled')
    return
  }

  const startedAt = now() + (parameters.delayMs ?? 0)
  const duration = parameters.durationMs ?? 900
  bound.target.setAttribute('data-au-motion-state', 'entering')

  const tick = (timestamp: number) => {
    const progress = clamp01((timestamp - startedAt) / duration)
    const value = parameters.from + (parameters.to - parameters.from) * progress
    bound.target.textContent = format(value)
    if (progress >= 1) {
      bound.frame = null
      bound.target.setAttribute('data-au-motion-state', 'settled')
      return
    }
    bound.frame = requestFrame(tick)
  }

  bound.frame = requestFrame(tick)
}

function progressReveal(
  bound: BoundMotion,
  progress: number,
  reducedMotion: boolean,
) {
  if (bound.binding.capabilityId !== 'story-progress-reveal.v1') return
  if (bound.binding.trigger !== 'scroll-progress') return
  const parameters = bound.binding.parameters
  const normalizedProgress = reducedMotion ? 1 : clamp01(progress)
  const value = parameters.fromPercent
    + (parameters.toPercent - parameters.fromPercent) * normalizedProgress
  bound.target.style.clipPath = `inset(0 ${100 - value}% 0 0)`
  bound.target.setAttribute('data-au-motion-state', normalizedProgress >= 1 ? 'settled' : 'active')
}

function progressRevealOnEnter(bound: BoundMotion, reducedMotion: boolean) {
  if (
    bound.binding.capabilityId !== 'story-progress-reveal.v1'
    || bound.binding.trigger !== 'scene-enter'
  ) return
  const parameters = bound.binding.parameters
  const from = `inset(0 ${100 - parameters.fromPercent}% 0 0)`
  const to = `inset(0 ${100 - parameters.toPercent}% 0 0)`
  bound.target.style.clipPath = to

  if (reducedMotion) {
    bound.target.setAttribute('data-au-motion-state', 'settled')
    return
  }

  animateTarget(
    bound,
    [{ clipPath: from }, { clipPath: to }],
    {
      duration: parameters.durationMs ?? 600,
      delay: parameters.delayMs ?? 0,
      easing: parameters.easing ?? 'ease-out',
      fill: 'both',
    },
  )
}

function restoreBoundMotion(
  bound: BoundMotion,
  cancelFrame: (handle: number) => void,
) {
  bound.animation?.cancel()
  if (bound.frame !== null) cancelFrame(bound.frame)
  setOrRemoveAttribute(bound.target, 'data-au-motion-capability', bound.original.capability)
  setOrRemoveAttribute(bound.target, 'data-au-motion-state', bound.original.state)
  setOrRemoveAttribute(bound.target, 'data-au-motion-reduced', bound.original.reduced)
  bound.target.style.opacity = bound.original.opacity
  bound.target.style.transform = bound.original.transform
  if (bound.original.translate) {
    bound.target.style.setProperty('translate', bound.original.translate)
  } else {
    bound.target.style.removeProperty('translate')
  }
  bound.target.style.clipPath = bound.original.clipPath
  if (bound.original.text !== null) bound.target.textContent = bound.original.text
}

export function createSceneMotionController(
  options: StoryMotionControllerOptions,
): StoryMotionController {
  const diagnostics = validateSceneMotionTargets(
    options.root,
    options.sceneKey,
    options.presentation,
  )
  if (diagnostics.length) throw new StoryMotionBindingError(diagnostics)

  const reducedMotion = options.reducedMotion ?? defaultReducedMotion()
  const now = options.now ?? (() => performance.now())
  const requestFrame = options.requestFrame ?? defaultRequestFrame
  const cancelFrame = options.cancelFrame ?? defaultCancelFrame
  const targets = motionTargetsForScene(options.root, options.sceneKey)
  const targetsByKey = new Map(
    targets.map(target => [target.getAttribute('data-au-motion-key') || '', target]),
  )
  const bindings: BoundMotion[] = options.presentation.bindings.map((binding, index) => {
    const target = targetsByKey.get(binding.targetKey) as HTMLElement

    return {
      binding,
      target,
      index,
      animation: null,
      frame: null,
      entered: false,
      original: {
        capability: originalAttribute(target, 'data-au-motion-capability'),
        state: originalAttribute(target, 'data-au-motion-state'),
        reduced: originalAttribute(target, 'data-au-motion-reduced'),
        opacity: target.style.opacity,
        transform: target.style.transform,
        translate: target.style.getPropertyValue('translate'),
        clipPath: target.style.clipPath,
        text: target.textContent,
      },
    }
  })

  for (const bound of bindings) {
    bound.target.setAttribute('data-au-motion-capability', bound.binding.capabilityId)
    bound.target.setAttribute('data-au-motion-state', 'inactive')
    if (reducedMotion) bound.target.setAttribute('data-au-motion-reduced', 'true')
  }

  return {
    update(state) {
      for (const bound of bindings) {
        if (!state.active) {
          bound.target.setAttribute('data-au-motion-state', 'inactive')
          continue
        }

        if (!bound.entered) {
          bound.entered = true
          revealOnEnter(bound, reducedMotion)
          countUpOnEnter(bound, reducedMotion, now, requestFrame)
          progressRevealOnEnter(bound, reducedMotion)
        }

        scrollProgressTransform(bound, state.progress, reducedMotion)
        progressReveal(bound, state.progress, reducedMotion)
      }
    },
    destroy() {
      for (const bound of bindings) restoreBoundMotion(bound, cancelFrame)
    },
  }
}
