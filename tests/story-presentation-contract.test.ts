import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { STORY_PRESENTATION_CONTRACT_VERSION } from '../app/types/storytime/scenes'
import {
  MOTION_CAPABILITIES,
  MOTION_CAPABILITY_REGISTRY_HASH,
  MOTION_CAPABILITY_REGISTRY_VERSION,
  MOTION_ROLE_PROFILE_DECLARATIONS,
} from '../app/types/storytime/motionCapabilities.generated'

type Fixture = {
  presentation: Record<string, unknown>
  scenes: Record<string, unknown>[]
}

type ContractWarning = {
  instancePath: string
  message: string
}

const contractRoot = resolve(process.cwd(), 'contracts/story-presentation')

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

const storySchema = readJson<Record<string, unknown>>(
  resolve(contractRoot, 'story-presentation.schema.json'),
)
const sceneSchema = readJson<Record<string, unknown>>(
  resolve(contractRoot, 'scene-presentation.schema.json'),
)
const scrollySchema = readJson<Record<string, unknown>>(
  resolve(contractRoot, 'modes/scrolly.schema.json'),
)
const motionSchema = readJson<Record<string, unknown>>(
  resolve(contractRoot, 'modes/motion.schema.json'),
)
const motionRegistrySchema = readJson<Record<string, unknown>>(
  resolve(contractRoot, 'motion-capability-registry.schema.json'),
)
const motionRegistryPath = resolve(contractRoot, 'motion-capabilities.json')
const motionRegistrySource = readFileSync(motionRegistryPath)
const motionRegistry = JSON.parse(motionRegistrySource.toString('utf8')) as {
  version: string
  profileDeclarations: Record<'story' | 'website' | 'social', 'populated' | 'declared_empty'>
  capabilities: {
    id: string
    executor: string
    reducedMotion: string
    focusPolicy: string
    roleClassifications: { target_profile: string; role: string }[]
  }[]
}
const version = readJson<{ version: string }>(resolve(contractRoot, 'version.json'))

const ajv = new Ajv2020({ allErrors: true, strictSchema: false })
ajv.addSchema(scrollySchema)
ajv.addSchema(motionSchema)
const validateStory = ajv.compile(storySchema)
const validateScene = ajv.compile(sceneSchema)
const validateMotionRegistry = ajv.compile(motionRegistrySchema)

function errors(validate: ValidateFunction): ErrorObject[] {
  return validate.errors || []
}

function unknownTopLevelWarnings(value: Record<string, unknown>): ContractWarning[] {
  const known = new Set(Object.keys(storySchema.properties as Record<string, unknown>))

  return Object.keys(value)
    .filter(key => !known.has(key))
    .sort()
    .map(key => ({
      instancePath: `/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`,
      message: `Unknown story presentation key: ${key}`,
    }))
}

function fixture(name: string): Fixture {
  const fixtures: Record<string, string> = {
    marico: resolve(process.cwd(), 'tests/fixtures/story-presentation/marico.json'),
    we2: resolve(process.cwd(), 'tests/fixtures/story-presentation/we2.json'),
  }

  return readJson<Fixture>(fixtures[name])
}

describe('story presentation contract', () => {
  it.each(['we2', 'marico'])('%s presentation fixture conforms', name => {
    const value = fixture(name)

    expect(validateStory(value.presentation), JSON.stringify(errors(validateStory), null, 2)).toBe(true)
    expect(unknownTopLevelWarnings(value.presentation)).toEqual([])

    for (const scene of value.scenes) {
      expect(validateScene(scene), JSON.stringify(errors(validateScene), null, 2)).toBe(true)
    }
  })

  it('reports malformed values with JSON-pointer diagnostics', () => {
    const value = fixture('we2').presentation
    const malformed = {
      ...value,
      controls: {
        ...(value.controls as Record<string, unknown>),
        variant: 42,
      },
    }

    expect(validateStory(malformed)).toBe(false)
    expect(errors(validateStory)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instancePath: '/controls/variant' }),
      ]),
    )
  })

  it('permits unknown top-level extensions but reports warnings', () => {
    const value = {
      ...fixture('we2').presentation,
      timedPath: { steps: [] },
      futureMode: true,
    }

    expect(validateStory(value)).toBe(true)
    expect(unknownTopLevelWarnings(value)).toEqual([
      {
        instancePath: '/futureMode',
        message: 'Unknown story presentation key: futureMode',
      },
      {
        instancePath: '/timedPath',
        message: 'Unknown story presentation key: timedPath',
      },
    ])
  })

  it('keeps the generated version constant aligned with version.json', () => {
    expect(STORY_PRESENTATION_CONTRACT_VERSION).toBe(version.version)
  })

  it('advertises narrative treatment and canonical block index grouping', () => {
    const properties = sceneSchema.properties as Record<string, unknown>
    const articleStep = ((properties.articleSteps as Record<string, unknown>).items as Record<string, unknown>)
    const articleProperties = articleStep.properties as Record<string, unknown>

    expect(validateScene({
      narrativeTreatment: 'synchronized',
      articleSteps: [{ blockIndexes: [0, 1] }, { blockIndex: 2 }],
    })).toBe(true)
    expect(validateScene({ narrativeTreatment: 'sometimes' })).toBe(false)
    expect(articleProperties).toHaveProperty('blockIndexes')
    expect(articleProperties).toHaveProperty('blockIndex')
    expect(articleProperties).not.toHaveProperty('blockIds')
  })

  it('accepts bounded motion and rejects selector or parameter escape hatches', () => {
    const validMotion = {
      version: '1.0.0',
      registryVersion: MOTION_CAPABILITY_REGISTRY_VERSION,
      registryHash: MOTION_CAPABILITY_REGISTRY_HASH,
      bindings: [
        {
          targetKey: 'headline',
          capabilityId: 'story-reveal-on-enter.v1',
          trigger: 'scene-enter',
          parameters: { axis: 'y', distancePx: 24, durationMs: 480 },
        },
      ],
    }

    expect(validateScene({ motion: validMotion }), JSON.stringify(errors(validateScene), null, 2)).toBe(true)
    expect(validateScene({
      motion: {
        ...validMotion,
        bindings: [
          {
            ...validMotion.bindings[0],
            selector: '.headline',
            parameters: { axis: 'y', distancePx: 400 },
          },
        ],
      },
    })).toBe(false)
    expect(errors(validateScene).some(error => error.instancePath.includes('/motion/bindings/0'))).toBe(true)
  })

  it('keeps the capability registry valid, generated, unique, and hashed', () => {
    expect(validateMotionRegistry(motionRegistry), JSON.stringify(errors(validateMotionRegistry), null, 2)).toBe(true)
    expect(new Set(motionRegistry.capabilities.map(capability => capability.id)).size)
      .toBe(motionRegistry.capabilities.length)
    expect(MOTION_CAPABILITY_REGISTRY_VERSION).toBe(motionRegistry.version)
    expect(MOTION_ROLE_PROFILE_DECLARATIONS).toEqual(motionRegistry.profileDeclarations)
    expect(MOTION_CAPABILITY_REGISTRY_HASH).toBe(
      createHash('sha256').update(motionRegistrySource).digest('hex'),
    )
    expect(MOTION_CAPABILITIES).toEqual(motionRegistry.capabilities)

    const serializedMotionSchema = JSON.stringify(motionSchema)
    for (const capability of motionRegistry.capabilities) {
      expect(serializedMotionSchema.includes(capability.id)).toBe(capability.executor === 'storytime')
    }
  })

  it('freezes the ratified profile-scoped role mappings without changing accessibility policy', () => {
    expect(motionRegistry.profileDeclarations).toEqual({
      story: 'populated',
      website: 'declared_empty',
      social: 'declared_empty',
    })
    expect(
      Object.fromEntries(
        motionRegistry.capabilities.map(capability => [
          capability.id,
          capability.roleClassifications.map(classification => classification.role),
        ]),
      ),
    ).toEqual({
      'pod-css-keyframes.v1': ['enter', 'ambient'],
      'pod-css-transition.v1': ['interaction'],
      'story-reveal-on-enter.v1': ['enter'],
      'story-scroll-progress-transform.v1': ['progress'],
      'story-count-up-on-enter.v1': ['enter'],
      'story-progress-reveal.v1': ['enter', 'progress'],
    })
    expect(
      Object.fromEntries(
        motionRegistry.capabilities.map(capability => [
          capability.id,
          [capability.reducedMotion, capability.focusPolicy],
        ]),
      ),
    ).toEqual({
      'pod-css-keyframes.v1': ['disable', 'not-interactive'],
      'pod-css-transition.v1': ['disable', 'preserve'],
      'story-reveal-on-enter.v1': ['final-state', 'preserve'],
      'story-scroll-progress-transform.v1': ['final-state', 'not-interactive'],
      'story-count-up-on-enter.v1': ['final-state', 'not-interactive'],
      'story-progress-reveal.v1': ['final-state', 'not-interactive'],
    })
    expect(motionRegistry.capabilities.flatMap(capability => capability.roleClassifications)).toSatisfy(
      classifications => classifications.every(classification => classification.target_profile === 'story'),
    )
  })
})
