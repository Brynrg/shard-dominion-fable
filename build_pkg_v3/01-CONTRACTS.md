# 01 — Pinned Contracts (the anti-bug bedrock)
Every failure so far lived here. These are LAW. Any deviation = ADR + operator ok.
Write these as actual types/modules in the repo FIRST (during Slice 0), export
them, and make every other file import from them. No inline reinvention.

==============================================================================
## 1. The ONE entity shape  (src/sim/core/entity.ts)
There is exactly one nesting level: `entity.components.<field>`. Never deeper.

  type EntityId = number;                      // monotonic, assigned by the store
  interface Entity { id: EntityId; components: Components; }
  interface Components {
    type: string;          // 'harvester' | 'refinery' | 'combat_tank_v' | ...
    owner: number;         // player id; -1 = neutral
    x: number; y: number;  // WORLD units (see §3). NEVER tile or pixel here.
    facing?: number;       // 0..15 (16ths of a turn)
    hp?: number; maxHp?: number; armor?: string;   // 'NONE'|'LIGHT'|'MEDIUM'|'HEAVY'|'BUILDING'
    movable?:   { speed: number; path: TilePt[]; pathIdx: number; stuck: number };
    harvester?: { state: 'SEEK'|'HARVEST'|'RETURN'|'DOCK'; load: number;
                  fieldTarget?: TilePt; refineryId?: EntityId };
    building?:  { onSlab: boolean; buildProgress: number; upgraded: boolean; powerDrain: number };
    producer?:  { queue: string[]; progress: number; rally?: TilePt };
    attacker?:  { weaponId: string; cooldown: number; targetId?: EntityId; stance: 'AGGRESSIVE'|'GUARD'|'HOLD' };
    vision?:    { range: number };
  }
  type TilePt = { tx: number; ty: number };

### EntityStore (src/sim/core/entity-store.ts) — the API that broke twice
  create(c: Components): EntityId   // takes the COMPONENTS object, returns the id.
                                     // It assigns entity.id internally. Callers do
                                     // NOT pass an id and do NOT wrap in {components}.
  get(id): Entity | undefined
  all(): Entity[]                    // ascending id order (deterministic iteration)
  destroy(id): void
CORRECT:   const id = store.create({ type:'harvester', owner:0, x:40*256, y:40*256, hp:700, maxHp:700, harvester:{state:'SEEK',load:0} });
           const e = store.get(id); e.components.x   // defined
WRONG (the round-2 bug): store.create({ id:1, components:{...} })  // double-nests
Invariant test (Slice 0): after the CORRECT call, store.get(id)!.components.x === 40*256.

==============================================================================
## 2. The state tree  (src/sim/core/state.ts)
  interface SimState {
    tick: number; seed: number; rngState: number;
    map: { w: number; h: number; tiles: Tile[] };   // FLAT array, length w*h, index = ty*w + tx
    players: PlayerState[];                           // index = player id
    projectiles: Projectile[];
    // NOTE: harvesters/refineries/units/buildings are NOT separate arrays.
    // They are entities in the store. The store is the single source of truth.
    // economy.credits/power live on PlayerState, computed from entities each tick.
  }
  interface Tile { terrain: TerrainType; shard: number; explored: boolean[] /* per player */; }
  interface PlayerState { faction: string; credits: number; storageCap: number;
                          powerSupply: number; powerDemand: number; }
sim.getState(): SimState  returns the live object (render reads it; never mutates it).
generateMap() MUST assign into state.map.tiles directly (the round-1 discard bug
was writing tiles[] and dropping it). One map path only — delete the tiles:[]
per-tick fallback.

==============================================================================
## 3. THREE coordinate spaces (src/sim/core/coords.ts + src/view/coords.ts)
Name them. Convert only through these functions. NO inline coordinate math anywhere.
  TILE_SUBUNITS = 256;   TILE_PX = 32;
  - WORLD: integers, 1 tile = 256 subunits. ALL entity positions. x in [0, w*256).
  - TILE:  tx = x >> 8  (i.e. worldX / 256). Used for terrain, shard, pathfinding,
           placement, fog. TilePt = {tx, ty}.
  - SCREEN: pixels on the canvas. Depends on camera {x,y in world-pixels, zoom}.
  worldToTile(x): tx = x >> 8
  tileToWorldCenter(tx): (tx<<8) + 128
  worldToScreen(x, y, cam): { sx: (x/256*TILE_PX - cam.x)*cam.zoom,
                              sy: (y/256*TILE_PX - cam.y)*cam.zoom }
  screenToWorld(sx, sy, cam): inverse of the above
  screenToTile(sx, sy, cam): worldToTile of screenToWorld
RENDER converts WORLD->SCREEN every frame. INPUT converts SCREEN->WORLD->TILE.
The NaN bug was an unconverted/undefined coordinate reaching fillRect — these
functions plus the entity shape make that structurally impossible if obeyed.

==============================================================================
## 4. Render contract  (src/view/render.ts)
render(state: SimState, cam: Camera, sel: Set<EntityId>, alpha: number): void
  1. clear canvas to bg (#0b0b10).
  2. drawTerrain(state.map, cam): only tiles whose screen rect intersects the
     viewport; fill by terrain color (palette.json); shard overlay on sand tiles
     keyed by tile.shard thresholds.
  3. drawEntities(state, cam): for each store.all(), worldToScreen, draw by type.
     Slices 0-8 use PLACEHOLDER GEOMETRY (see §6); P9 swaps to sprite atlases.
     hp bar if hp<maxHp; white ring if id in sel; facing tick for vehicles.
  4. drawProjectiles(state, cam).
  5. drawFog(state.map, currentPlayer, cam): shroud=black, explored-unseen=dim.
  6. RENDER RUNS EVERY rAF FRAME, unconditionally. It must NEVER be gated behind
     "did a sim tick fire this frame" — that was the round-2 dead-gate bug.

==============================================================================
## 5. Loop + input contracts
### Loop (src/main.ts) — fixed-timestep accumulator, draw every frame
  let last = performance.now(); let acc = 0;
  const STEP = 1000 / SIM_CONFIG.tickRate;          // 50ms @ 20Hz
  function frame(now){
    acc += now - last; last = now;
    let n = 0; while (acc >= STEP && n < 5){ sim.tick(); acc -= STEP; n++; }   // bounded
    render(sim.getState(), camera, selection, acc/STEP);                        // EVERY frame
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
NEVER write `last = now` unconditionally inside a tick gate (round-2 bug). Ticks
advance by call count only; tick() must not read wall-clock (§ determinism).

### Input (src/view/input.ts) -> Commands
  mousedown(LMB): screenToWorld -> start band box.
  mouseup(LMB): selection = entities whose screen AABB intersects the box (or the
    single click point); store ids in the view-only `selection: Set<EntityId>`.
  contextmenu(RMB) with selection: classify target tile/entity ->
    enemy unit/bldg => {type:'attack', args:{ids,[...], targetId}}
    own building (engineer selected) => {type:'capture'} ; shard tile (harvester)
    => {type:'harvest', args:{ids, tx,ty}} ; else => {type:'move', args:{ids, tx,ty}}
    sim.enqueue({ tick: sim.tick+1, playerId: 0, ...cmd });
  keys: A=attack-move mode, S=stop, H/G/X stance/scatter, 0-9 + ctrl groups,
    double-click = select all of same type on screen, shift = queue.
processCommand(cmd) (src/sim/systems/commands.ts) mutates entity.components
(movable.path via pathfinding, attacker.targetId, harvester.fieldTarget, etc.).
Commands carry TILE targets for movement; selection lives in the VIEW only and is
never part of sim state (keeps sim deterministic + headless-safe).

==============================================================================
## 6. Placeholder visual language (Slices 0-8; sprites arrive P9)
Generated in render code, zero asset files. Faction color = fill.
  infantry = triangle 12px | light vehicle = chevron 16px | tank = rect 20px with
  a 6px turret line showing facing | air = circle | building = square sized to
  footprint with a letter glyph (C=ConYard P=Power R=Refinery B=Barracks
  L=LightFac H=HeavyFac D=Radar T=Turret) | harvester = rounded rect, fill ramps
  with load | shard tile = teal stipple, density in 3 tiers | selection = white
  ring | hp = 3px bar. This must read clearly BEFORE any art exists.
