import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StorySceneMotionPresentation } from '../app/types/storytime/scenes'
import {
  MOTION_CAPABILITY_REGISTRY_HASH,
  MOTION_CAPABILITY_REGISTRY_VERSION,
} from '../app/types/storytime/motionCapabilities.generated'
import {
  createSceneMotionController,
  StoryMotionBindingError,
  validateSceneMotionTargets,
} from '../app/utils/storytime/motion'

function presentation(
  binding: StorySceneMotionPresentation['bindings'][number],
): StorySceneMotionPresentation {
  return {
    version: '1.0.0',
    registryVersion: MOTION_CAPABILITY_REGISTRY_VERSION,
    registryHash: MOTION_CAPABILITY_REGISTRY_HASH,
    bindings: [binding],
  }
}

function sceneTarget(sceneKey = 'scene-one', targetKey = 'headline') {
  const root = document.createElement('main')
  root.innerHTML = `<section data-scene-key="${sceneKey}"><h1 data-au-motion-key="${targetKey}">Hello</h1></section>`
  document.body.append(root)

  return {
    root,
    target: root.querySelector('[data-au-motion-key]') as HTMLElement,
  }
}

describe('story motion runtime', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('resolves one registered target only inside the active scene', () => {
    const { root } = sceneTarget()
    root.insertAdjacentHTML(
      'beforeend',
      '<section data-scene-key="scene-two"><h1 data-au-motion-key="headline">Other</h1></section>',
    )
    const motion = presentation({
      targetKey: 'headline',
      capabilityId: 'story-reveal-on-enter.v1',
      trigger: 'scene-enter',
      parameters: { axis: 'y', distancePx: 20 },
    })

    expect(validateSceneMotionTargets(root, 'scene-one', motion)).toEqual([])
  })

  it('fails closed for missing, duplicate, and mismatched registry targets', () => {
    const { root } = sceneTarget()
    root.querySelector('[data-scene-key]')?.insertAdjacentHTML(
      'beforeend',
      '<span data-au-motion-key="headline">Duplicate</span>',
    )
    const motion = presentation({
      targetKey: 'headline',
      capabilityId: 'story-reveal-on-enter.v1',
      trigger: 'scene-enter',
      parameters: {},
    })

    expect(validateSceneMotionTargets(root, 'scene-one', motion)).toEqual([
      expect.objectContaining({ code: 'duplicate_target', pointer: '/motion/bindings/0/targetKey' }),
    ])
    expect(() => createSceneMotionController({
      root,
      sceneKey: 'scene-one',
      presentation: { ...motion, registryHash: 'a'.repeat(64) },
    })).toThrow(StoryMotionBindingError)
  })

  it('drives scroll transforms from normalized progress and restores styles', () => {
    const { root, target } = sceneTarget()
    target.style.opacity = '0.75'
    const controller = createSceneMotionController({
      root,
      sceneKey: 'scene-one',
      reducedMotion: false,
      presentation: presentation({
        targetKey: 'headline',
        capabilityId: 'story-scroll-progress-transform.v1',
        trigger: 'scroll-progress',
        parameters: {
          axis: 'y',
          from: 20,
          to: -20,
          unit: 'px',
          opacityFrom: 0.25,
          opacityTo: 1,
        },
      }),
    })

    controller.update({ active: true, progress: 0.5 })
    expect(target.style.translate).toBe('0 0px')
    expect(target.style.opacity).toBe('0.625')
    expect(target.dataset.auMotionState).toBe('active')
    expect(target.dataset.auMotionCapability).toBe('story-scroll-progress-transform.v1')

    controller.destroy()
    expect(target.style.getPropertyValue('translate')).toBe('')
    expect(target.style.opacity).toBe('0.75')
    expect(target.hasAttribute('data-au-motion-state')).toBe(false)
  })

  it('settles immediately for reduced motion without moving focus', () => {
    const { root, target } = sceneTarget()
    target.tabIndex = 0
    target.focus()
    const animate = vi.fn()
    Object.assign(target, { animate })
    const controller = createSceneMotionController({
      root,
      sceneKey: 'scene-one',
      reducedMotion: true,
      presentation: presentation({
        targetKey: 'headline',
        capabilityId: 'story-reveal-on-enter.v1',
        trigger: 'scene-enter',
        parameters: { axis: 'y', distancePx: 30, durationMs: 900 },
      }),
    })

    controller.update({ active: true, progress: 0 })
    expect(animate).not.toHaveBeenCalled()
    expect(target.style.opacity).toBe('1')
    expect(target.style.transform).toBe('none')
    expect(target.dataset.auMotionReduced).toBe('true')
    expect(target.dataset.auMotionState).toBe('settled')
    expect(document.activeElement).toBe(target)
  })

  it('uses final count and progress states when reduced motion is active', () => {
    const count = sceneTarget('scene-one', 'count')
    const countController = createSceneMotionController({
      root: count.root,
      sceneKey: 'scene-one',
      reducedMotion: true,
      presentation: presentation({
        targetKey: 'count',
        capabilityId: 'story-count-up-on-enter.v1',
        trigger: 'scene-enter',
        parameters: { from: 0, to: 42, prefix: '$', suffix: 'M' },
      }),
    })
    countController.update({ active: true, progress: 0 })
    expect(count.target.textContent).toBe('$42M')

    const progress = sceneTarget('scene-two', 'bar')
    const progressController = createSceneMotionController({
      root: progress.root,
      sceneKey: 'scene-two',
      reducedMotion: true,
      presentation: presentation({
        targetKey: 'bar',
        capabilityId: 'story-progress-reveal.v1',
        trigger: 'scroll-progress',
        parameters: { fromPercent: 0, toPercent: 80 },
      }),
    })
    progressController.update({ active: true, progress: 0 })
    expect(progress.target.style.clipPath).toBe('inset(0 20% 0 0)')
    expect(progress.target.dataset.auMotionState).toBe('settled')
  })
})
