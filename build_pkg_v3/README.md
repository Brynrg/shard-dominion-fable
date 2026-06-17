# Shard Dominion — Final Execution Spec (hand to the local builder team)

WHY THIS EXISTS
Two rounds shipped a blank screen with passing tests, because the tests measured
the SIM, never the PAGE, and the slices past Slice 0 were one paragraph each —
too thin for the builder to execute correctly. This package fixes both: it pins
the contracts the builder keeps breaking, fully specifies every slice with
acceptance assertions, and defines the finish line concretely.

READ IN THIS ORDER
  00-EXECUTION-SPEC.md   scope honesty, the "Dune-2000-comparable" finish-line
                         checklist, the unbreakable rules, the slice index.
  01-CONTRACTS.md        the entity shape, state tree, three coordinate spaces,
                         render/loop/input contracts. EVERY recurring bug is a
                         violation of one of these. This is the bedrock.
  02-SLICES.md           slices 0-6, each with exact files, HOW, and the
                         acceptance assertions to add and pass.
  tests/liveness/        the gate. Install FIRST; confirm it FAILS on the current
                         blank build; then nothing is "done" until the slice's
                         assertions pass against the DEPLOYED bundle + screenshot.
  playwright.config.notes.md   config + how to run a slice gate.

USES THE ORIGINAL PACKAGE
All design docs and balance JSON (factions/units/buildings/weapons/terrain/
techtree/neutral.json + the 5 campaign missions) from the original build package
remain authoritative. This spec changes only the SEQUENCING and adds the GATES.

FIRST THREE ACTIONS FOR THE BUILDER
  1. Install the liveness gate + Playwright. Run it against the live URL; it must
     FAIL on today's blank build (that proves the gate works).
  2. Write the 01-CONTRACTS modules (entity shape, coords, state) as real code;
     make sim + render import them. No inline shapes.
  3. Do Slice 0 only (loop accumulator + entity shape + one harvester+refinery).
     Make the S0 gate green, save the screenshot, STOP, report.
Do NOT build new sim systems, wire data, or touch determinism before the S0
screenshot shows a harvester moving.

THE BAR
Slice 6 = core-loop parity = "comparable to Dune 2000" (section B checklist in
00). Carryalls/worms/starport/superweapons/campaign/real-art = the original
package's P7-P9, run as more pixel-gated slices on top.
