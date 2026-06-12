# Shard Dominion — Complete Build Package

Self-contained execution package for an autonomous agent build. Everything needed to
build the game is in this package: mechanics with exact numbers, faction rosters,
campaign/story, AI design, UI spec, art pipeline (3D->sprite), audio spec, test plan,
phase plan with gates, and agent operating rules. The /data JSON files are the single
source of truth for all balance numbers — docs explain, data defines.

## Read order (agent MUST read all before writing code)
1. HANDOFF.txt            — master directive
2. docs/00-vision.md      — pillars + scope cut lines
3. docs/01-architecture.md— sim/view split, determinism (NON-NEGOTIABLE)
4. docs/02-mechanics.md   — full systems spec
5. docs/03-factions.md    — rosters and asymmetry
6. docs/10-phase-plan.md  — phases, gates, acceptance criteria
7. docs/11-agent-workflow.md — operating rules
8. Remaining docs as each phase requires (05 AI, 06 UI, 07 art, 08 audio, 09 tests, 04 campaign)

## Package map
docs/         design + execution specs
data/         game data (units, buildings, weapons, factions, tech, neutral, starport, terrain)
data/campaign/ mission definitions (5 MVP missions, Vanguard arc)
assets-spec/  sprite manifest, palettes, 3D->sprite pipeline scripts spec, generation prompts, audio manifest

## Ground rules (duplicated in HANDOFF.txt, repeated here on purpose)
- /src/sim is pure deterministic TypeScript. Zero Phaser/DOM imports. CI-enforced.
- Phase gates: automated tests green + headless smoke + operator approval. No skipping.
- Balance lives in JSON. Code never hardcodes a tunable number.
- Stop and write to docs/questions.md instead of guessing on design intent.
