# Shard Dominion (game 4) — Opus Round-2 Plan

**Driver:** Opus. Round 1 shipped the deploy contract + a clean deterministic-sim substrate
but **the live game renders a blank screen and has no gameplay** (verified by audit:
`final-pass/opus-shard-dominion-fable.md`). Round 2 = make it actually visible and playable,
building the Fable core loop on the existing sim. Keep the Fable vision (`build_pkg/docs/`);
ship-first, small green increments.

## Known defects from the round-1 audit (fix these first)
1. **Blank render — `Sim.generateMap()` discards its generated `tiles[]`** so `map.tiles` is
   permanently empty → nothing to draw. Persist the tiles into map state.
2. **Canvas never sized** in `src/main.ts` (stuck at the 300×150 default) → set width/height.
3. **`processCommand()` is a `// TODO` stub** → enqueued `move` commands do nothing. Implement it.
4. The rich data layer (factions, units, buildings, weapons, terrain, missions in `build_pkg/data/`)
   and `src/view/scenes/game-scene.ts` are imported by nothing — wire them in (don't add a parallel loop).

## Tickets (in order; each ends green + committed + pushed)

### BUILD 1 — UNBLOCK THE RENDER (flip live URL from blank to ALIVE)
- Persist `generateMap()` tiles into the sim map; size the canvas in main.ts; render the terrain
  grid + a couple of sim-driven entities to the canvas every tick. Implement `processCommand` enough
  to move an entity. DONE = the live page visibly shows a map + moving entity, smoke test green.

### BUILD 2 — THE FABLE CORE LOOP (per build_pkg/docs/02-mechanics.md)
- Terrain + shard fields (ROCK/SAND/DEEP_SAND, per-tile shard density).
- Harvester FSM (seek densest reachable → extract → return → deposit → credits in HUD).
- Base building: MCV→Construction Yard, grid placement, optional concrete (off-slab = 50% HP + decay)
  and power (deficit slows production) — the two signature Fable tradeoffs.
- Readable combat: opposing-faction units, targeting + damage + health bars.
- Each step its own green increment.

## Hard constraints (deploy contract — Fable broke these once; keep them)
- Strict TS; `npm run typecheck && npm run build && npm run lint:paths` green before every push.
- `test` = `playwright test` (smoke gate); keep the vitest determinism test under `test:sim`.
- Keep `base: "./"`, relative asset paths, `game.manifest.json` (framework `vite`, with
  repo/version/entry/buildCommand present). Gameplay numbers come from the data files.
- Route ALL gameplay through the one deterministic sim — no second update/render loop.
