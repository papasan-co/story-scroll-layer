# Story presentation contract

This directory is the source of truth for story and scene presentation metadata.
The contract uses JSON Schema draft 2020-12. Version `1.2.0` adds explicit
scene narrative treatments and canonical plural `blockIndexes` grouping.
Version `1.1.0` added bounded scene-motion bindings and the independently
hashed `MotionCapabilityRegistry.v1`.

`MotionCapabilityRegistry.v1` registry version `1.1.0` adds the ratified P2b
profile declarations and semantic role classifications. Story is populated;
website and social are declared empty. The classifications do not replace the
registry's executor, reduced-motion, focus, parameter, or evidence policy.

## Change rules

- Edit a schema first, bump `version.json`, then run `pnpm contracts:generate`.
- Never hand-edit `app/types/storytime/presentation.generated.ts` or
  `app/types/storytime/motionCapabilities.generated.ts`.
- Add a presentation mode as a new schema under `modes/`, reference it from the
  base schema, and bump the minor contract version.
- Reserve major version bumps for breaking changes to the base contract.
- Unknown top-level keys remain valid in v1 but validators report them as
  warnings. This lets an in-flight mode mature before its fragment is added.
- Run `pnpm contracts:sync` from the D19 workspace to refresh the independently
  deployed backend and story-component copies.

The contract contains scrolly and motion fragments. Motion bindings may name
only Storytime-executor capabilities from `motion-capabilities.json`; pod-CSS
capabilities remain execution-plan inputs and never become presentation code.
Timed-path metadata stays pre-contract until the MNE mode stabilizes.
