import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { STORY_PRESENTATION_CONTRACT_VERSION } from '../app/types/storytime/scenes'

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
const version = readJson<{ version: string }>(resolve(contractRoot, 'version.json'))

const ajv = new Ajv2020({ allErrors: true, strictSchema: false })
ajv.addSchema(scrollySchema)
const validateStory = ajv.compile(storySchema)
const validateScene = ajv.compile(sceneSchema)

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
})
