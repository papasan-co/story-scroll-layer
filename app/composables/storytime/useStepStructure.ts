import type { FlatStoryStep, StoryScene } from '../../types/storytime/scenes'

export function useStepStructure(scenes: StoryScene[]): FlatStoryStep[] {
  return scenes.flatMap((scene, idx) => {
    return scene.articles.map((a, i) => ({ sceneIdx: idx, localStep: i, article: a }))
  })
}

