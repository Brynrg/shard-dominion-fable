# 01 — Architecture

## Repo layout
```
shard-dominion/
  src/
    sim/            PURE deterministic simulation. No Phaser, no DOM, no Date, no Math.random.
      core/         tick loop, command queue, entity store, prng, fixedpoint, hash
      systems/      movement, pathfinding, harvest, construction, power, combat,
                    production, logistics(carryall), worms, blooms, fog, capture,
                    stealth, starport, ai
      data/         zod schemas + loaders for /data JSON
      index.ts      Sim facade: new Sim(seed, mapData, config) / sim.enqueue(cmd) /
                    sim.tick() / sim.hash() / sim.serialize() / Sim.deserialize()
    view/           Phaser 3 only. Renders sim state, translates input to commands.
      scenes/       Boot, MainMenu, SkirmishSetup, Game, Briefing, Results
      render/       terrain, entities, fog, effects, healthbars
      ui/           sidebar, minimap, selection, hud, cursors
    headless/       Node CLI runner (no Phaser import anywhere in its dep tree)
  data/             game data JSON (copied from this package, then owned by repo)
  assets/           sprites, audio, maps (Tiled JSON)
  tools/            blender render scripts, atlas packer, balance batch runner
  tests/            vitest suites (sim only; view tested by operator smoke)
  docs/adr/         architecture decision records
  docs/questions.md agent->operator blocker log
```

## Determinism rules (CI-enforced, violations are build failures)
1. eslint no-restricted-imports: anything under src/sim cannot import phaser, dom
   libs, or src/view. Additional CI grep for Math.random|Date.now|performance.now
   inside src/sim.
2. Fixed tick: 20 ticks/second. View interpolates between ticks for smooth render.
3. Positions/velocities: integers in 1/256-tile subunits. No floats in game state.
   Fixed-point via (a*b)>>8 style ops; prefer squared-distance comparisons; integer
   sqrt approximation only where unavoidable.
4. PRNG: mulberry32, seeded per match. ALL gameplay randomness flows through
   sim.rng. View may use its own RNG for cosmetic-only effects.
5. Deterministic iteration: entity store iterates ascending entity id; never
   iterate untracked object keys; arrays/sorted structures only.
6. State hash: FNV-1a over canonical serialization of all sim state. sim.hash()
   cheap enough to call every 100 ticks in tests.

## Entity model (ECS-lite, no framework)
EntityId = number (monotonic). Struct-of-arrays component stores:
Transform{x,y,facing16}, Health{hp,maxHp,armorClass}, Movable{speed,path,pathIdx,
stuckTicks}, Attacker{weaponId,cooldown,targetId,stance}, Harvester{state,load,
fieldTarget,refineryId}, Building{typeId,onSlab,buildProgress,rallyX,rallyY,
upgraded,powerDrain}, Producer{queue[],progress}, Cloaked{active,energy},
Owner{playerId}, Carryall{task,cargoId}, Selectable, Vision{range}.

Systems run in FIXED ORDER each tick: commands -> production -> construction ->
power -> harvest -> logistics -> ai -> movement(path+collision) -> combat ->
worms -> blooms -> stealth -> fog -> cleanup(deaths) -> victory check.

Command pattern: every player/AI intent is Command{tick,playerId,type,args}
appended to a log. Replays = map + seed + command log.

## Pathfinding
- Grid A* (binary heap, 8-dir, no corner cutting) over tile costs from
  data/terrain.json. All mobile units are 1-tile footprint; buildings are static
  blockers stamped into the grid.
- Group move: ONE path for group centroid, formation offsets (ring packing); units
  within 2 tiles of shared destination spread to nearest free tile. Individual
  repath only on stuck (no progress for 15 ticks).
- Dynamic avoidance: spatial hash (4x4 tile buckets); overlap push-resolution; a
  unit blocked by a stationary idle friendly requests a sidestep.
- Predictability over optimality. Do NOT implement flow fields, navmesh, or
  hierarchical A* unless the 200-unit perf gate fails. First optimization if it
  does: path cache keyed by (startRegion,endRegion), 2s TTL.

## Performance budget per tick (headless bench, M-series Node)
movement+path <= 8ms worst, combat <= 3ms, fog <= 2ms, all else <= 3ms.
View: sprite pooling, one texture atlas per category, fog as RenderTexture with
erase painting, camera culling with margin.

## Save/load
serialize(): JSON of entity store + system states + rng state + tick + command log
tail. deserialize() reconstructs exactly; test asserts hash equality after a
mid-battle round-trip.
