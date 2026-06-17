# 02 — Slice Specs (each: GOAL / TOUCHES / HOW / WIRE / ACCEPTANCE / TAG)
Build in order. Obey 01-CONTRACTS. Each ACCEPTANCE block lists the exact
assertions added to the liveness suite (or vitest) — the builder must ADD these
tests, make them green against the deployed bundle, save the screenshot, then
STOP and report. Do not start the next slice before operator approval.

==============================================================================
## SLICE 0 — blank -> alive
GOAL: terrain + one harvester visibly moving at the live URL.
TOUCHES: src/main.ts (loop), src/sim/core/entity-store.ts, src/view/render.ts,
  src/sim/core/sim.ts (generateMap assign), src/view/coords.ts.
HOW:
  1. Implement the contracts in 01 §1-5 as real modules; make sim + render import
     coords.ts and the Entity type (no inline shapes).
  2. Replace the render loop with the accumulator in 01 §5; render EVERY frame.
  3. Fix EntityStore.create to 01 §1 (single arg = components, returns id).
  4. generateMap assigns tiles directly into state.map.tiles (01 §2); delete the
     tiles:[] fallback.
  5. render() draws terrain (per-tile fill) + all entities via placeholder geometry.
WIRE (main.ts at startup):
  const ref = store.create({type:'refinery',owner:0,x:tileToWorldCenter(20),y:tileToWorldCenter(20),hp:900,maxHp:900,building:{onSlab:true,buildProgress:1,upgraded:false,powerDrain:30}});
  const hv  = store.create({type:'harvester',owner:0,x:tileToWorldCenter(40),y:tileToWorldCenter(40),hp:700,maxHp:700,harvester:{state:'SEEK',load:0,refineryId:ref}});
  sim.enqueue({tick:1,playerId:0,type:'move',args:{ids:[hv],tx:30,ty:30}});  // temporary, proves motion
ACCEPTANCE (add to liveness.spec.ts):
  - getContext called >0; fillRect+drawImage >50.
  - non-background pixels >5%.
  - screenshot at t=1s != screenshot at t=3s (motion).
  - NEW: the harvester moved — capture entity 0 screen position at t=1s vs t=3s
    via page.evaluate(()=> window.__debugEntityScreenPos(hv)); assert it changed.
    (Expose a tiny window.__debugEntityScreenPos in dev builds only.)
  - vitest: store.create/get round-trip; components.x defined and === expected.
TAG: slice-0-alive. STOP. Report + screenshot.

==============================================================================
## SLICE 1 — economy visible
GOAL: harvester FSM drives the real loop; credits rise on a HUD; shards thin.
TOUCHES: src/sim/systems/harvest.ts, sim.ts updateEconomy, render.ts (shard tiers,
  harvester load fill), HUD (SpeedrunGames SDK storage bar), data loader for
  terrain.json economyConstants.
HOW:
  1. Wire updateEconomy to drive harvester.state SEEK->HARVEST->RETURN->DOCK using
     numbers from terrain.json (harvestRatePerSec 25, capacity 700, unloadPerSec
     100, refineryStorage 2000) via a zod loader — no literals.
  2. SEEK: A* (or for now nearest-reachable) to densest known shard tile; HARVEST:
     drain tile.shard, fill load; RETURN: path to nearest own refinery with space;
     DOCK: move credits into PlayerState.credits up to storageCap, drop overflow.
  3. tile.shard depletion reflected in render (3 density tiers, tile empties).
  4. Surface PlayerState.credits + storage usage in the HUD; warn at 90% + on full.
WIRE: spawn 3 harvesters + 2 refineries + 1 silo for player 0 on the start map.
ACCEPTANCE:
  - liveness: credits readout increases between t=2s and t=8s (read via
    window.__debugCredits(0)); >=2 entities change tile between samples.
  - liveness: at least one shard tile's density decreases over the window.
  - vitest: 3-harvester scenario, fixed seed, credits at tick N === expected
    EXACT; overflow test (full storage => credits clamp, never exceed cap).
TAG: slice-1-economy.

==============================================================================
## SLICE 2 — input + selection (the CONTROL half of playable)
GOAL: the player can select and order units with the mouse/keyboard.
TOUCHES: src/view/input.ts, src/sim/systems/commands.ts (processCommand),
  render.ts (selection ring, band box, move-target flash).
HOW (per 01 §5):
  1. LMB click/band-box -> selection:Set<EntityId> (view only).
  2. RMB -> classify target -> enqueue move/attack/harvest/capture command.
  3. processCommand handles move (set movable.path via pathfinding to TILE target),
     stop (clear path), attack (set attacker.targetId), harvest (set fieldTarget).
  4. Keys: A attack-move, S stop, ctrl+0-9 assign, 0-9 select, double-click
     select-same-type-on-screen, shift queue waypoints.
  5. render draws selection rings, the live band box, and a move flash.
ACCEPTANCE:
  - liveness (scripted Playwright input): click a unit -> its selection ring
    appears (non-bg pixels in a probed region change); right-click elsewhere ->
    that unit's screen position changes within 2s.
  - liveness: band-box drag selects >1 unit (window.__debugSelectionCount() >1).
  - vitest: processCommand('move') sets a non-empty path; ('stop') clears it;
    ('attack') sets targetId.
TAG: slice-2-control.   (Now: SEE + CONTROL both true — minimally "playable".)

==============================================================================
## SLICE 3 — base building (concrete + power)
GOAL: deploy MCV, build from sidebar, place buildings, power + concrete matter.
TOUCHES: sim systems construction.ts, power.ts; buildings.json loader; sidebar UI;
  placement-preview in render + input.
HOW:
  1. MCV deploy command -> ConYard (needs 3x3 clear ROCK). Single build thread per
     ConYard; sidebar queue (depth 5); drip-spend credits per buildings.json.
  2. On complete, enter PLACEMENT mode: preview footprint, per-tile green/yellow/red
     (valid terrain + adjacency<=8-neighborhood to own building + within 12 tiles
     of a ConYard + slab coverage). Click places; off-slab => spawn 50% hp +
     building.onSlab=false + decay; on-slab => 100%.
  3. power.ts: sum supply (power_node scaled by hp ratio) vs demand; deficit =>
     production multiplier max(0.4, supply/demand); radar + rocket_turret offline;
     gun_turret unaffected.
  4. Slabs (slab_2x2 / 3x3) as placeable; isTileOnConcrete check.
  5. Sell (50% refund, demolition) + repair toggle (0.3cr/hp, 20hp/s).
  ALL numbers from buildings.json (cost/time/hp/footprint/power/prereq/upgrade) +
  terrain.json economyConstants.
WIRE: start the player with an MCV + starting credits per the map.
ACCEPTANCE:
  - liveness (scripted): build a power_node via sidebar -> it appears on canvas;
    HUD power supply increases.
  - liveness: place a refinery OFF slab -> rendered hp bar shows ~50% +
    window.__debugBuildingHp shows <=0.55*maxHp and decaying.
  - vitest: off-slab spawn 50%, repair to 80% -> decays to 50% & stops; on-slab
    100% no decay; killing a power node flips production multiplier + offline flags
    at the exact threshold tick; drip-spend pauses (not cancels) at 0 credits.
TAG: slice-3-base.

==============================================================================
## SLICE 4 — units + combat (factions + RPS)
GOAL: produce all three factions' rosters; readable counter-based combat.
TOUCHES: sim systems production.ts, combat.ts, projectile.ts; units.json +
  weapons.json + factions.json loaders; render projectiles + death/explosion.
HOW:
  1. Producer queues at barracks/light/heavy (units.json producer + prereqUpgrade).
     Building UPGRADES gate advanced units (techtree.json) — no research lab.
  2. combat.ts: acquire by target priority (01-mechanics §2.7); damage =
     weapon.damage * weapons.json damageMatrix[type][armorClass] — READ from JSON,
     delete the literal matrix at sim.ts:431-441.
  3. projectile.ts: travel time except BULLET hitscan; SIEGE/EXPLOSIVE splash with
     falloff + friendly fire; turreted vehicles track independent of hull facing.
  4. Stances (AGGRESSIVE/GUARD/HOLD); harvester flees toward refinery when hit;
     engineer capture math at the 33% boundary; deaths/cleanup; victory check
     (a player with zero buildings is eliminated).
  5. Faction combat-tank variants + uniques per factions.json/units.json.
ACCEPTANCE:
  - liveness (scripted 2-base headless-ish at the URL): units produce, projectiles
    visibly fly (drawImage/fillRect count for projectiles >0), a building is
    destroyed (explosion frames), match reaches a winner.
  - vitest COUNTER MATRIX (the core of "readable"): cost-equal fights assert
    700cr missile_quad pack beats 700cr combat tank; scout pack beats infantry
    pack; siege tanks lose to equal-cost combat tanks; engineer flips a building
    <=33%. These come from the JSON, so a bad number fails here, not in code.
TAG: slice-4-combat.

==============================================================================
## SLICE 5 — fog + minimap + full control parity
GOAL: classic fog, working minimap/radar, camera + all hotkeys/groups.
TOUCHES: sim systems fog.ts (per-player tile.explored + current-visible set),
  render fog pass, sidebar minimap, camera module, input groups/hotkeys.
HOW:
  1. fog.ts: per-unit vision marks tiles visible this tick; explored stays true
     forever (classic). Render: shroud black, explored-unseen dim, visible full.
  2. Minimap canvas region: terrain underlay + fog overlay + friendly green / enemy
     red blips (enemy only when radar powered AND currently visible) + building
     blips in explored; click jump; right-drag move order; attack pings (10s/region).
  3. Camera pan (edge/WASD/MMB-drag) + zoom (2 steps), clamped to map.
  4. Finish hotkey parity: ctrl-groups, double-tap jump, E select-army, backspace
     last ping, stance keys.
ACCEPTANCE:
  - liveness: start shows large dark (shrouded) area (>40% near-black pixels
    OUTSIDE the start base region); moving a unit into shroud reveals terrain
    (that region's non-bg pixels rise).
  - liveness: minimap region renders blips (non-bg pixels in minimap rect >0).
  - vitest: fog-honest — a unit outside any friendly vision is NOT in the
    player's visible set; explored never reverts to shroud.
TAG: slice-5-fog.

## SLICE 5.5 — determinism made real (priority 5; may run after S2)
TOUCHES: tick-loop.ts, tests/sim/determinism.test.ts.
HOW: tick = pure call count (no performance.now in tick()); rewrite determinism
test to enqueue commands processCommand REALLY handles (move/harvest/build/
produce/attack) so equal-hash across two seeded runs guards real mutation, not a
frozen state. Collapse duplicate hash()/hashState(); drop orphan game-scene.ts +
the phaser dep (raw canvas 2D is the renderer); use or delete fixedpoint.ts.
ACCEPTANCE: vitest determinism over 5000 ticks with a real command log: two runs,
hash equal every 100 ticks; serialize->deserialize mid-run -> hash identical.
TAG: slice-5_5-determinism.

==============================================================================
## SLICE 6 — AI opponent + skirmish = CORE-LOOP PARITY (v1.0)
GOAL: a fog-honest AI that plays a real match; full skirmish flow; the finish line.
TOUCHES: sim systems ai.ts (governor + build-director + battle-commander FSM +
  threat map), factions.json ai loaders, skirmish-setup + results scenes, 3 more
  maps, balance harness tools/balance_run.ts.
HOW (full spec: original package docs/05):
  1. Economy governor (harvester targets, rebuild priority, expand on depletion).
  2. Build director runs a factions.json opening, then a priority table.
  3. Battle commander FSM: SCOUT/DEFEND/RAID/PUSH/REBUILD/HARASS_RESPONSE at the
     difficulty decision cadence; threat map for approach + defense placement.
  4. AI is FOG-HONEST: wrap its world view in a guarded accessor; any read of an
     entity outside its vision set is a test failure.
  5. Difficulty = cost multipliers + decision cadence (factions.json difficulty).
  6. Skirmish setup (map/faction/difficulty/color), win/lose detection, results.
  7. Author 3 more maps (Worm Belt, Quarry, Spires) per docs/07 map rules.
ACCEPTANCE — this is THE finish-line gate (section B of 00-EXECUTION-SPEC):
  - liveness: operator-driven full match to a win at the URL, screenshot of
    victory screen.
  - headless: tools/balance_run 50-match AI-vs-AI completes, no stalls
    (watchdog: no command for 60s while credits>800 & queue empty = fail), each
    faction wins >=25% per pairing, median length 12-25 min.
  - vitest: fog-honest accessor test; loss-spiral handling (no ConYard + no MCV
    => all-in push, no stall).
  - operator: one full match per faction to a win AND a loss, no crash; section B
    checklist fully ticked.
TAG: v1.0-playable.   THIS IS "COMPARABLE TO DUNE 2000". Stop, certify, decide on
P7-P9 depth.
