import type { StoryTimedPathChapter, StoryTimedPathPresentation, StoryTimedPathStep } from '../../types/storytime/scenes'

export type TimedPathSceneGroup = {
  key: string
  label: string
  positions: number[]
}

export function timedPathStepSceneKey(step: StoryTimedPathStep): string {
  return step.sceneKey || step.sourceKey || step.key
}

export function isTimedPathChoiceStep(
  step: StoryTimedPathStep | undefined,
  choiceStepType = 'choice',
): boolean {
  if (!step) return false
  return step.type === choiceStepType || (Array.isArray(step.choices) && step.choices.length > 0)
}

export function buildTimedPathSequence(
  steps: StoryTimedPathStep[],
  paths: Record<string, string[]> | null | undefined,
  selectedPath: string | null | undefined,
  choiceStepType = 'choice',
): number[] {
  if (!steps.length) return []

  if (!selectedPath) {
    const choiceIndex = steps.findIndex(step => isTimedPathChoiceStep(step, choiceStepType))
    if (choiceIndex >= 0) {
      return Array.from({ length: choiceIndex + 1 }, (_, index) => index)
    }

    return steps.map((_, index) => index)
  }

  const pathSceneKeys = paths?.[selectedPath] || []
  if (!pathSceneKeys.length) return steps.map((_, index) => index)

  const sequence: number[] = []
  for (const sceneKey of pathSceneKeys) {
    for (let index = 0; index < steps.length; index += 1) {
      if (timedPathStepSceneKey(steps[index]) === sceneKey) sequence.push(index)
    }
  }

  return sequence.length ? sequence : steps.map((_, index) => index)
}

export function buildTimedPathSceneGroups(
  steps: StoryTimedPathStep[],
  sequence: number[],
): TimedPathSceneGroup[] {
  const groups: TimedPathSceneGroup[] = []

  for (let position = 0; position < sequence.length; position += 1) {
    const step = steps[sequence[position]]
    if (!step) continue

    const key = timedPathStepSceneKey(step)
    const last = groups[groups.length - 1]
    if (last?.key === key) {
      last.positions.push(position)
      continue
    }

    groups.push({
      key,
      label: step.sceneLabel || key,
      positions: [position],
    })
  }

  return groups
}

export function resolveTimedPathChapterTarget(
  chapter: StoryTimedPathChapter,
  steps: StoryTimedPathStep[],
  sequence: number[],
): number | null {
  const stepKeys = new Set(chapter.stepKeys || [])
  const sceneKeys = new Set(chapter.sceneKeys || [chapter.key])

  for (const stepIndex of sequence) {
    const step = steps[stepIndex]
    if (!step) continue
    if (stepKeys.has(step.key) || sceneKeys.has(timedPathStepSceneKey(step))) return stepIndex
  }

  return null
}

export function normalizeTimedPathPresentation(
  timedPath: StoryTimedPathPresentation | null | undefined,
): StoryTimedPathPresentation {
  const value = { ...(timedPath || {}) }

  value.steps = Array.isArray(value.steps) ? value.steps : []
  value.paths = value.paths && typeof value.paths === 'object' ? value.paths : {}
  value.chapters = Array.isArray(value.chapters) ? value.chapters : []
  value.controls = { ...(value.controls || {}) }
  value.choiceStepType = typeof value.choiceStepType === 'string' && value.choiceStepType.trim()
    ? value.choiceStepType
    : 'choice'

  return value
}
