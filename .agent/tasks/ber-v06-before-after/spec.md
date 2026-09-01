# Task: ber-v06-before-after

## Task Statement

Ship Better Every Run v0.6.0 as a conversion release with a concrete before/after correction artifact.

## Acceptance Criteria

**AC1:** README exposes the before/after correction proof near the top.
- Verify: inspect README for the v0.6 focus line, proof image, and link to `examples/before-after-correction.md`.

**AC2:** A standalone before/after artifact explains bad behavior, `/ber fix`, local evidence, promotion boundaries, and improved later behavior.
- Verify: inspect `examples/before-after-correction.md`.

**AC3:** A visual proof asset exists and is referenced by README.
- Verify: inspect `assets/ber-before-after-correction.svg` and README reference.

**AC4:** Safety/product boundaries remain explicit-only and no durable auto-write path is introduced.
- Verify: inspect README/SKILL and run smoke tests for direct durable-write refusals.

**AC5:** Tests pass and release surfaces identify v0.6.0.
- Verify: run `make test`, inspect `SKILL.md`, Git tag/release, and Actions after release.

**AC6:** ClawHub visibility is verified or explicitly recorded if registry propagation lags.
- Verify: publish/install/inspect `better-every-run@0.6.0` from a clean tag archive.

## Constraints

- Keep BER explicit-only; do not auto-capture ordinary chat.
- Never publish `.better-every-run/` local state.
- Keep helper behavior stable unless tests require a small fix.

## Non-Goals

- No web UI, database, server, or plugin wrapper.
- No broad rewrite of the helper.

## Verification Approach

Run `make test`, inspect docs/assets, validate release state, clean clone, and ClawHub install/inspect after publish.
