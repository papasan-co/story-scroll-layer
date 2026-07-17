# Story presentation contract

This directory is the source of truth for story and scene presentation metadata.
The contract uses JSON Schema draft 2020-12 and starts at version `1.0.0`.

## Change rules

- Edit a schema first, bump `version.json`, then run `pnpm contracts:generate`.
- Never hand-edit `app/types/storytime/presentation.generated.ts`.
- Add a presentation mode as a new schema under `modes/`, reference it from the
  base schema, and bump the minor contract version.
- Reserve major version bumps for breaking changes to the base contract.
- Unknown top-level keys remain valid in v1 but validators report them as
  warnings. This lets an in-flight mode mature before its fragment is added.
- Run `pnpm contracts:sync` from the D19 workspace to refresh the independently
  deployed backend and story-component copies.

The first version contains only the scrolly fragment. Timed-path metadata stays
pre-contract until the MNE mode stabilizes.
