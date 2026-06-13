# Shard Dominion (game 4) — Opus Driver Plan

**Driver:** Opus (Claude). Fable authored the original plan but its first-pass build never
shipped — it over-invested in a pure deterministic-sim foundation, broke the deploy contract
(rewrote `ci.yml`, swapped the test runner to vitest), failed to compile (`hash.ts`), and
never committed after ~7h. Opus takes over with the **opposite philosophy: ship a playable,
deployable slice FIRST, then layer depth.** Salvage the good work; don't restart.

## What exists (uncommitted in the workspace — salvage, don't delete)
A well-architected deterministic sim core (~600 lines): `src/sim/core/` (fixedpoint, prng,
hash, command-queue, entity-store, sim, tick-loop, types), a `src/view/scenes/game-scene.ts`,
and tests. It does NOT compile and is NOT wired to anything visible.

## Hard constraints (deploy contract — non-negotiable, this is what Fable broke)
- **Restore the template deploy contract:** `package.json#scripts.test` must be `playwright test`
  (the portal CI runs it as the smoke gate). Keep the vitest determinism test, but under a
  SEPARATE script (`test:sim`), never as `test`. Restore `.github/workflows/ci.yml` to the
  template's job shape (the portal expects `build`, `typecheck`, `lint:paths`, `test`).
- Keep `base: "./"` in vite.config, relative asset paths, `game.manifest.json`.
- `npm run typecheck && npm run build && npm run lint:paths` must pass before every push.
- Every push to main auto-deploys; ship in small green increments.

## Tickets (execute in order — each ends green, committed, pushed)

### BUILD 1 — STABILIZE & SHIP A PLAYABLE SLICE (top priority; gets game 4 LIVE)
1. **Restore deploy contract:** revert `ci.yml` to template; set `scripts.test` back to
   `playwright test`; move the vitest determinism test to `scripts.test:sim`. Keep
   `build/typecheck/lint:paths`.
2. **Fix the compile error** in `src/sim/core/hash.ts` (TS2554) and any others until
   `npm run typecheck` is clean.
3. **Wire a minimal playable slice:** `src/main.ts` boots the deterministic sim's `tick-loop`
   and renders sim state to the canvas — even a basic top-down view of the grid + a few moving
   entities driven by the sim (not random). Show the speedrungames HUD/timer.
4. **Green + ship:** `typecheck && build && lint:paths && test` all pass → commit → push.
   **Definition of done for BUILD 1: the game is live and visibly running the sim at
   https://speedrungames.net/games/shard-dominion-fable/** (it has never shipped a real build).

### BUILD 2 — RTS GAMEPLAY ON THE SALVAGED SIM
5. **Entities + data:** load the faction/unit/building data; spawn a harvester + a combat unit
   as real sim entities with components.
6. **Movement:** click-to-move on the grid via the sim (the deterministic core already has the
   primitives — use them, don't add a parallel system).
7. **Economy loop:** harvester FSM (seek shard → mine → return → deposit → credits in HUD).
8. **Combat:** basic targeting + damage between opposing factions; surface unit health.
   Each ships as its own green increment.

## Notes for the builder
- The sim core is the asset — route ALL gameplay through it (one source of truth). Do NOT add
  a second render/update loop.
- Pragmatism over purity: a playable, shippable slice beats an unshipped perfect sim. If a
  determinism guarantee blocks shipping, relax it (move the determinism test to `test:sim`,
  non-blocking) and note it — don't let it gate the deploy.
- The bake-off first-pass comparison for games 1-3 is frozen by their `first-pass` tags; game 4
  never shipped a first pass, so BUILD 1's ship becomes game 4's first real playable baseline,
  attributed to Opus as driver.
