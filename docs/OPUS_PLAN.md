# Shard Dominion (game 4) — Opus Driver Plan (iteration of the Fable plan)

**Driver:** Opus (Claude), continuing from Fable's design. **Keep the Fable vision; change the
sequencing.** Fable's plan (`build_pkg/docs/`) is a genuinely strong faithful-Westwood RTS
design — economy-is-the-game, optional-concrete-with-decay, power pressure, asymmetric factions,
the planet-fights-back (Titan Worms / Shard Blooms), all on a deterministic sim core. The
problem was never the design; it was **purity-first execution** — the build chased a perfect
deterministic sim + full tooling and never shipped anything playable (broke the deploy contract,
didn't compile, 0 commits in ~7h). Opus re-sequences it **ship-first**: get a playable slice
LIVE, then build the Fable loop on top in green increments.

## Design source of truth (unchanged — this is still the game)
`build_pkg/docs/` — esp. 00-vision (pillars), 02-mechanics (terrain/economy/concrete/power/
construction/combat numbers), 03-factions, 06-ui. Build TOWARD Fable's **v1.0 ship target
(its Phases 0-6): skirmish vs AI, core economy/base/combat/UI loop.** Carry the 5 pillars:
(1) economy is the game, (2) meaningful tradeoffs not taxes, (3) asymmetry on a shared spine,
(4) readable battlefield, (5) the planet fights back.

## Salvage (uncommitted in the workspace — keep, don't delete)
~600 lines of deterministic sim core: `src/sim/core/` (fixedpoint, prng, hash, command-queue,
entity-store, sim, tick-loop, types). This is the correct architecture and Fable's best asset —
route ALL gameplay through it (one source of truth, no parallel loops).

## Deploy contract (non-negotiable — Fable broke this; restore it)
- `package.json#scripts.test` MUST be `playwright test` (portal CI smoke gate). Keep the vitest
  determinism test but as `test:sim`, never as `test`. Restore template `.github/workflows/ci.yml`.
- Keep `base: "./"`, relative asset paths, `game.manifest.json`. `npm run typecheck && build &&
  lint:paths && test` green before every push. Push = auto-deploy; ship small green increments.

## Tickets (in order; each ends green + committed + pushed)

### BUILD 1 — STABILIZE & SHIP (get it LIVE; it has never shipped)
1. Restore the deploy contract (test→playwright, vitest→`test:sim`, template ci.yml).
2. Fix `src/sim/core/hash.ts` TS2554 + all compile errors → `npm run typecheck` clean.
3. Wire `src/main.ts`: boot the sim `tick-loop`, render its state to a Phaser/canvas view —
   a fixed-tick world with the deterministic PRNG visibly driving a few entities (NOT Math.random).
   Show the speedrungames HUD/timer.
4. Green (typecheck+build+lint:paths+test) → commit → push. **DONE = visibly running at
   https://speedrungames.net/games/shard-dominion-fable/ .**

### BUILD 2 — THE FABLE CORE LOOP (pillar 1: economy is the game)
Build toward a playable skirmish spine using the 02-mechanics numbers:
5. **Terrain + shard fields:** ROCK/SAND/DEEP_SAND tiles; sand carries shard density (0-1000/tile).
6. **Harvester FSM + refinery:** harvester (cap 700) SEEK densest reachable → extract 25/sec →
   return → deposit; refinery stores 2000, overflow lost; credits in the HUD storage bar.
7. **Base building:** MCV deploys (3x3 ROCK) → Construction Yard; single construction thread;
   grid placement; **optional concrete** (off-slab = 50% HP + decay) and **power** (deficit slows
   production) — the two signature Fable tradeoffs.
8. **Readable combat:** spawn opposing-faction units; legible RPS counters; targeting + damage +
   health bars. Stub the planet-fights-back hooks (Shard Bloom → hazard tiles) for a later pass.
Each step is its own green, committed, pushed increment.

## Notes for the builder
- Pragmatism over purity: a shipped playable slice beats an unshipped perfect sim. If the
  determinism guarantee blocks shipping, keep `test:sim` non-blocking and proceed — don't let it
  gate the deploy.
- Reuse the sim core's primitives (entity-store, command-queue, fixed-point, PRNG). Do NOT write
  a second update/render loop or a parallel grid.
- Data-driven: gameplay numbers live in `build_pkg/data/*.json` / `src/data/` — wire those in,
  don't hardcode.
